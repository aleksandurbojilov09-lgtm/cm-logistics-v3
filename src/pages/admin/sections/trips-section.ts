import "./trips-section.css";
import "./trips-editing.css";
import "./trips-truck-change.css";

import {
    addAdminOrderToTrip,
    loadAdminActiveTrips,
    loadAdminAvailableOrders,
    moveAdminFutureStop,
    removeAdminFutureStop,
    updateAdminStopLoad,
    type AdminActiveTrip,
    type AdminActiveTripStop,
    type AdminAvailableOrder,
    type AdminTripInsertMode,
    type AdminTripMoveDirection
} from "../../../features/trips/admin-trip-service";

import {
    escapeHtml
} from "../../../shared/lib/html";

import {
    handleTruckChangeClick,
    handleTruckChangeFieldChange,
    handleTruckChangeSubmit,
    refreshTruckChangeState,
    renderTruckChangeButton,
    renderTruckChangeStatus,
    resetTruckChangeDialogState
} from "./trips-truck-change";


const MAX_TRUCK_TONS =
    24;


let trips:
    AdminActiveTrip[] =
    [];


let availableOrders:
    AdminAvailableOrder[] =
    [];


let refreshVersion =
    0;


let refreshTimer:
    number | null =
    null;


/* =========================================================
   PAGE
   ========================================================= */


export function renderSection():
string {

    return `
        <section
            id="k3TripsSection"
            class="trips-section"
        >

            <div
                id="k3TripsMessage"
                class="trips-message"
                aria-live="polite"
            ></div>


            <div
                class="trips-summary"
            >

                <article
                    class="trips-summary-card"
                >
                    <span>
                        Активни курсове
                    </span>

                    <strong
                        id="k3TripsCount"
                    >
                        0
                    </strong>
                </article>


                <article
                    class="trips-summary-card"
                >
                    <span>
                        Активни шофьори
                    </span>

                    <strong
                        id="k3TripsDriversCount"
                    >
                        0
                    </strong>
                </article>


                <article
                    class="trips-summary-card"
                >
                    <span>
                        Спирки в движение
                    </span>

                    <strong
                        id="k3TripsStopsCount"
                    >
                        0
                    </strong>
                </article>

            </div>


            <section
                class="trips-panel"
            >

                <header
                    class="trips-panel-header"
                >

                    <div>
                        <h3>
                            🗺️ Активни курсове
                        </h3>

                        <p>
                            Текуща композиция,
                            маршрут и редакция на
                            разрешените спирки.
                        </p>
                    </div>


                    <button
                        type="button"
                        class="trips-refresh-button"
                        data-trips-action="refresh"
                    >
                        ↻ Обнови
                    </button>

                </header>


                <div
                    id="k3ActiveTripsList"
                    class="trips-list"
                >
                    <div
                        class="trips-empty"
                    >
                        Зареждане...
                    </div>
                </div>

            </section>


            <dialog
                id="k3TripActionDialog"
                class="trip-action-dialog"
            ></dialog>

        </section>
    `;
}


/* =========================================================
   HELPERS
   ========================================================= */


function getRoot():
HTMLElement | null {

    return document.querySelector(
        "#k3TripsSection"
    );
}


function getDialog():
HTMLDialogElement | null {

    return document.querySelector<
        HTMLDialogElement
    >(
        "#k3TripActionDialog"
    );
}


function errorMessage(
    error: unknown
): string {

    return (
        error instanceof Error &&
        error.message
    )
        ? error.message
        : "Възникна неочаквана грешка.";
}


function getTruckChangeHost() {

    return {
        findTrip,
        getDialog,
        refresh,
        setMessage,
        errorMessage
    };
}


function formatTons(
    value: number
): string {

    if (
        !Number.isFinite(value)
    ) {
        return "0";
    }


    return value
        .toFixed(3)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
}


function formatDate(
    value: string | null
): string {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? "-"
        : date.toLocaleString(
            "bg-BG"
        );
}


function setMessage(
    message: string,
    type:
        | "success"
        | "error"
        | null
): void {

    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3TripsMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "trips-message";


    if (type) {

        element.classList.add(
            `trips-message-${type}`
        );
    }
}


function tripLoad(
    trip: AdminActiveTrip
): number {

    return trip.stops.reduce(
        (
            total,
            stop
        ) =>
            total +
            stop.assignedTons,
        0
    );
}


function tripFreeTons(
    trip: AdminActiveTrip
): number {

    return Math.max(
        MAX_TRUCK_TONS -
        tripLoad(trip),
        0
    );
}


function currentStop(
    trip: AdminActiveTrip
): AdminActiveTripStop | null {

    return (
        trip.stops.find(
            stop =>
                stop.status ===
                    "en_route"
        ) ||
        null
    );
}


function findTrip(
    tripId: string
): AdminActiveTrip | null {

    return (
        trips.find(
            trip =>
                trip.id ===
                    tripId
        ) ||
        null
    );
}


function findStop(
    stopId: string
): {
    trip: AdminActiveTrip;
    stop: AdminActiveTripStop;
    index: number;
} | null {

    for (
        const trip
        of trips
    ) {

        const index =
            trip.stops.findIndex(
                stop =>
                    stop.id ===
                        stopId
            );


        if (index >= 0) {

            return {
                trip,
                stop:
                    trip.stops[index],
                index
            };
        }
    }


    return null;
}


function stopStatusLabel(
    stop: AdminActiveTripStop
): string {

    switch (
        stop.status
    ) {

        case "en_route":
            return "🚛 Текуща";

        case "loaded":
            return "✅ Натоварено";

        case "waiting":
            return "⏳ Предстои";
    }
}


function stopStatusClass(
    stop: AdminActiveTripStop
): string {

    switch (
        stop.status
    ) {

        case "en_route":
            return "trip-stop-current";

        case "loaded":
            return "trip-stop-loaded";

        case "waiting":
            return "trip-stop-waiting";
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */


function renderSummary():
void {

    const tripCount =
        document.querySelector<
            HTMLElement
        >(
            "#k3TripsCount"
        );


    const driverCount =
        document.querySelector<
            HTMLElement
        >(
            "#k3TripsDriversCount"
        );


    const stopsCount =
        document.querySelector<
            HTMLElement
        >(
            "#k3TripsStopsCount"
        );


    if (tripCount) {

        tripCount.textContent =
            String(
                trips.length
            );
    }


    if (driverCount) {

        const drivers =
            new Set(
                trips
                    .map(
                        trip =>
                            trip.primaryDriverId
                    )
                    .filter(Boolean)
            );


        driverCount.textContent =
            String(
                drivers.size
            );
    }


    if (stopsCount) {

        const count =
            trips.reduce(
                (
                    total,
                    trip
                ) =>
                    total +
                    trip.stops.filter(
                        stop =>
                            stop.status !==
                                "loaded"
                    ).length,
                0
            );


        stopsCount.textContent =
            String(
                count
            );
    }
}


/* =========================================================
   STOP ADMIN ACTIONS
   ========================================================= */


function renderStopActions(
    trip: AdminActiveTrip,
    stop: AdminActiveTripStop,
    index: number
): string {

    if (
        stop.status ===
        "loaded"
    ) {
        return "";
    }


    if (
        stop.status ===
        "en_route"
    ) {

        return `
            <div
                class="trip-stop-admin-actions"
            >

                <button
                    type="button"
                    class="trip-stop-edit-load"
                    data-trips-action="edit-load"
                    data-stop-id="${escapeHtml(
                        stop.id
                    )}"
                >
                    ⚖️ Коригирай тонажа
                </button>

            </div>
        `;
    }


    const previous =
        trip.stops[
            index - 1
        ];


    const next =
        trip.stops[
            index + 1
        ];


    const canMoveUp =
        Boolean(
            previous &&
            previous.status ===
                "waiting"
        );


    const canMoveDown =
        Boolean(
            next &&
            next.status ===
                "waiting"
        );


    return `
        <div
            class="trip-stop-admin-actions"
        >

            <button
                type="button"
                class="trip-stop-move-button"
                data-trips-action="move-stop"
                data-stop-id="${escapeHtml(
                    stop.id
                )}"
                data-direction="up"
                ${
                    canMoveUp
                        ? ""
                        : "disabled"
                }
                title="Премести нагоре"
            >
                ↑
            </button>


            <button
                type="button"
                class="trip-stop-move-button"
                data-trips-action="move-stop"
                data-stop-id="${escapeHtml(
                    stop.id
                )}"
                data-direction="down"
                ${
                    canMoveDown
                        ? ""
                        : "disabled"
                }
                title="Премести надолу"
            >
                ↓
            </button>


            <button
                type="button"
                class="trip-stop-edit-load"
                data-trips-action="edit-load"
                data-stop-id="${escapeHtml(
                    stop.id
                )}"
            >
                ⚖️ Тонаж
            </button>


            <button
                type="button"
                class="trip-stop-remove-button"
                data-trips-action="remove-stop"
                data-stop-id="${escapeHtml(
                    stop.id
                )}"
            >
                🗑️ Премахни
            </button>

        </div>
    `;
}


/* =========================================================
   ROUTE STOP
   ========================================================= */


function renderStop(
    trip: AdminActiveTrip,
    stop: AdminActiveTripStop,
    index: number
): string {

    return `
        <article
            class="
                trip-stop
                ${stopStatusClass(
                    stop
                )}
            "
        >

            <div
                class="trip-stop-number"
            >
                ${escapeHtml(
                    String(
                        stop.stopNumber
                    )
                )}
            </div>


            <div
                class="trip-stop-body"
            >

                <header
                    class="trip-stop-header"
                >

                    <div>
                        <strong>
                            ${escapeHtml(
                                stop.companyName ||
                                "Фирма"
                            )}
                        </strong>

                        <span>
                            Заявка
                            #${escapeHtml(
                                stop.orderNumber
                            )}
                        </span>
                    </div>


                    <span
                        class="trip-stop-status"
                    >
                        ${escapeHtml(
                            stopStatusLabel(
                                stop
                            )
                        )}
                    </span>

                </header>


                <div
                    class="trip-stop-location"
                >
                    📍

                    <strong>
                        ${escapeHtml(
                            stop.siteName ||
                            "-"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            stop.address ||
                            "-"
                        )}
                    </span>
                </div>


                <div
                    class="trip-stop-details"
                >

                    <span>
                        ⚖️
                        ${escapeHtml(
                            formatTons(
                                stop.assignedTons
                            )
                        )}
                        т.
                    </span>


                    ${
                        stop.phone

                            ? `
                                <span>
                                    📞
                                    ${escapeHtml(
                                        stop.phone
                                    )}
                                </span>
                            `

                            : ""
                    }


                    ${
                        stop.etaNotifiedAt

                            ? `
                                <span
                                    class="trip-stop-eta"
                                >
                                    🔔 Клиентът е уведомен
                                </span>
                            `

                            : ""
                    }

                </div>


                ${
                    stop.note

                        ? `
                            <div
                                class="trip-stop-note"
                            >
                                📝
                                ${escapeHtml(
                                    stop.note
                                )}
                            </div>
                        `

                        : ""
                }


                ${
                    stop.loadedAt

                        ? `
                            <div
                                class="trip-stop-time"
                            >
                                Натоварено:
                                ${escapeHtml(
                                    formatDate(
                                        stop.loadedAt
                                    )
                                )}
                            </div>
                        `

                        : ""
                }


                ${renderStopActions(
                    trip,
                    stop,
                    index
                )}

            </div>

        </article>
    `;
}


/* =========================================================
   TRIP CARD
   ========================================================= */


function renderTripCard(
    trip: AdminActiveTrip
): string {

    const segment =
        trip.activeSegment;


    const load =
        tripLoad(
            trip
        );


    const free =
        tripFreeTons(
            trip
        );


    const current =
        currentStop(
            trip
        );


    const loadedStops =
        trip.stops.filter(
            stop =>
                stop.status ===
                    "loaded"
        ).length;


    return `
        <article
            class="trip-card"
        >

            <header
                class="trip-card-header"
            >

                <div
                    class="trip-card-title"
                >

                    <div
                        class="trip-card-title-row"
                    >

                        <h4>
                            🚛
                            ${escapeHtml(
                                segment
                                    ?.truckNumber ||
                                "Камион"
                            )}
                        </h4>


                        <span
                            class="trip-active-badge"
                        >
                            ● Активен курс
                        </span>

                    </div>


                    <div
                        class="trip-driver"
                    >
                        👨‍✈️
                        ${escapeHtml(
                            segment
                                ?.driverName ||
                            "-"
                        )}
                    </div>


                    <div
                        class="trip-started"
                    >
                        Курс
                        #${escapeHtml(
                            trip.tripNumber
                        )}

                        • Стартиран:
                        ${escapeHtml(
                            formatDate(
                                trip.startedAt
                            )
                        )}
                    </div>

                </div>


                <div
                    class="trip-card-stats"
                >

                    <div>
                        <span>
                            Спирки
                        </span>

                        <strong>
                            ${escapeHtml(
                                String(
                                    trip.stops.length
                                )
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Товар
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatTons(
                                    load
                                )
                            )}
                            т.
                        </strong>
                    </div>


                    <div
                        class="trip-free-stat"
                    >
                        <span>
                            Свободни
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatTons(
                                    free
                                )
                            )}
                            т.
                        </strong>
                    </div>

                </div>

            </header>


            <div
                class="trip-composition"
            >

                <div>
                    <span>
                        🚛 Камион
                    </span>

                    <strong>
                        ${escapeHtml(
                            segment
                                ?.truckNumber ||
                            "-"
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        🛻 Ремарке
                    </span>

                    <strong>
                        ${escapeHtml(
                            segment
                                ?.trailerNumber ||
                            "-"
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Позиция / Permit
                    </span>

                    <strong>
                        ${escapeHtml(
                            segment
                                ?.positionNumber ||
                            "-"
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Начален км
                    </span>

                    <strong>
                        ${escapeHtml(
                            segment

                                ? String(
                                    segment.startKm
                                )

                                : "-"
                        )}
                    </strong>
                </div>

            </div>


            ${
                !segment

                    ? `
                        <div
                            class="trip-data-warning"
                        >
                            ⚠️ Активният курс няма
                            намерен активен сегмент.
                        </div>
                    `

                    : ""
            }


            ${renderTruckChangeStatus(
                trip
            )}


            ${
                current

                    ? `
                        <section
                            class="trip-current-stop"
                        >

                            <span>
                                Текуща спирка
                            </span>

                            <strong>
                                ${escapeHtml(
                                    current.companyName
                                )}
                            </strong>

                            <p>
                                📍
                                ${escapeHtml(
                                    current.siteName
                                )}
                                —
                                ${escapeHtml(
                                    current.address
                                )}
                            </p>


                            <div>
                                ⚖️
                                ${escapeHtml(
                                    formatTons(
                                        current.assignedTons
                                    )
                                )}
                                т.

                                ${
                                    current.etaNotifiedAt
                                        ? " • 🔔 Клиентът е уведомен"
                                        : ""
                                }
                            </div>

                        </section>
                    `

                    : trip.stops.length > 0 &&
                        loadedStops ===
                            trip.stops.length

                        ? `
                            <section
                                class="
                                    trip-current-stop
                                    trip-current-stop-finished
                                "
                            >
                                <strong>
                                    ✅ Всички спирки са натоварени.
                                </strong>

                                <p>
                                    Може да бъде добавена
                                    нова заявка или курсът
                                    да бъде приключен от шофьора.
                                </p>
                            </section>
                        `

                        : ""
            }


            <section
                class="trip-route"
            >

                <header
                    class="trip-route-header"
                >

                    <div>
                        <h5>
                            📍 Маршрут
                        </h5>

                        <span>
                            ${escapeHtml(
                                String(
                                    loadedStops
                                )
                            )}
                            /
                            ${escapeHtml(
                                String(
                                    trip.stops.length
                                )
                            )}
                            натоварени
                        </span>
                    </div>


                    <div
                        class="trip-progress"
                    >
                        <div
                            class="trip-progress-bar"
                            style="width: ${
                                trip.stops.length > 0

                                    ? Math.round(
                                        (
                                            loadedStops /
                                            trip.stops.length
                                        ) *
                                        100
                                    )

                                    : 0
                            }%"
                        ></div>
                    </div>

                </header>


                <div
                    class="trip-route-list"
                >

                    ${
                        trip.stops.length > 0

                            ? trip.stops
                                .map(
                                    (
                                        stop,
                                        index
                                    ) =>
                                        renderStop(
                                            trip,
                                            stop,
                                            index
                                        )
                                )
                                .join("")

                            : `
                                <div
                                    class="trips-empty"
                                >
                                    Курсът няма спирки.
                                </div>
                            `
                    }

                </div>

            </section>


            <footer
                class="trip-card-footer"
            >

                <div
                    class="trip-card-footer-info"
                >
                    <span>
                        🔒 Натоварените спирки са заключени.
                    </span>

                    <span>
                        ↕️ Само бъдещите могат да се местят или премахват.
                    </span>
                </div>


                ${renderTruckChangeButton(
                    trip
                )}


                <button
                    type="button"
                    class="trip-add-order-button"
                    data-trips-action="add-order"
                    data-trip-id="${escapeHtml(
                        trip.id
                    )}"
                    ${
                        segment
                            ? ""
                            : "disabled"
                    }
                >
                    ➕ Добави заявка
                </button>

            </footer>

        </article>
    `;
}


/* =========================================================
   RENDER
   ========================================================= */


function renderTrips():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveTripsList"
        );


    if (!container) {
        return;
    }


    renderSummary();


    if (
        trips.length === 0
    ) {

        container.innerHTML = `
            <div
                class="trips-empty"
            >
                💤 Няма активни курсове.
            </div>
        `;


        return;
    }


    container.innerHTML =
        trips
            .map(
                renderTripCard
            )
            .join("");
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refresh():
Promise<void> {

    const version =
        ++refreshVersion;


    try {

        const nextTrips =
            await loadAdminActiveTrips();


        if (
            version !==
                refreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        await refreshTruckChangeState(
            nextTrips
        );


        if (
            version !==
                refreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        trips =
            nextTrips;


        renderTrips();


    } catch (error) {

        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        setMessage(
            errorMessage(
                error
            ),
            "error"
        );
    }
}


function startPolling():
void {

    stopPolling();


    refreshTimer =
        window.setInterval(
            () => {

                if (
                    !getRoot()?.isConnected
                ) {

                    stopPolling();

                    return;
                }


                void refresh();

            },
            5000
        );
}


function stopPolling():
void {

    if (
        refreshTimer !==
        null
    ) {

        window.clearInterval(
            refreshTimer
        );


        refreshTimer =
            null;
    }
}


/* =========================================================
   DIALOG
   ========================================================= */


function closeDialog():
void {

    const dialog =
        getDialog();


    if (
        dialog?.open
    ) {
        dialog.close();
    }


    if (dialog) {

        dialog.innerHTML =
            "";
    }


    availableOrders =
        [];


    resetTruckChangeDialogState();
}


/* =========================================================
   EDIT TONS
   ========================================================= */


function openEditLoadDialog(
    stopId: string
): void {

    const found =
        findStop(
            stopId
        );


    const dialog =
        getDialog();


    if (
        !found ||
        !dialog
    ) {
        return;
    }


    const {
        stop
    } =
        found;


    if (
        stop.status ===
        "loaded"
    ) {

        setMessage(
            "Натоварена спирка не може да бъде редактирана.",
            "error"
        );

        return;
    }


    dialog.innerHTML = `
        <form
            id="k3TripEditLoadForm"
            class="trip-action-form"
            data-stop-id="${escapeHtml(
                stop.id
            )}"
        >

            <header
                class="trip-action-dialog-header"
            >

                <div>
                    <h3>
                        ⚖️ Корекция на тонаж
                    </h3>

                    <p>
                        ${escapeHtml(
                            stop.companyName
                        )}
                        —
                        ${escapeHtml(
                            stop.siteName
                        )}
                    </p>
                </div>


                <button
                    type="button"
                    class="trip-dialog-close"
                    data-trips-action="close-dialog"
                    aria-label="Затвори"
                >
                    ✕
                </button>

            </header>


            <div
                class="trip-action-info"
            >
                <span>
                    Текущо зачислен товар
                </span>

                <strong>
                    ${escapeHtml(
                        formatTons(
                            stop.assignedTons
                        )
                    )}
                    т.
                </strong>
            </div>


            <label>
                Нов тонаж

                <input
                    id="k3TripEditLoadTons"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    inputmode="decimal"
                    value="${escapeHtml(
                        String(
                            stop.assignedTons
                        )
                    )}"
                />
            </label>


            <div
                class="trip-action-warning"
            >
                🔒 Backend-ът ще провери
                остатъка по заявката и
                максималния капацитет 24 т.
            </div>


            <button
                type="submit"
                class="trip-action-primary"
            >
                💾 Запази тонажа
            </button>

        </form>
    `;


    if (!dialog.open) {
        dialog.showModal();
    }
}


async function submitEditLoad(
    form: HTMLFormElement
): Promise<void> {

    const stopId =
        form.dataset.stopId;


    const input =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3TripEditLoadTons"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            '[type="submit"]'
        );


    if (
        !stopId ||
        !input ||
        !button
    ) {
        return;
    }


    const tons =
        Number(
            input.value
        );


    if (
        !Number.isFinite(tons) ||
        tons <= 0
    ) {

        setMessage(
            "Въведете валиден тонаж.",
            "error"
        );

        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Запазване...";


    try {

        await updateAdminStopLoad(
            stopId,
            tons
        );


        closeDialog();


        await refresh();


        setMessage(
            "✅ Тонажът е променен успешно.",
            "success"
        );


    } catch (error) {

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );


        button.disabled =
            false;


        button.textContent =
            "💾 Запази тонажа";
    }
}


/* =========================================================
   MOVE STOP
   ========================================================= */


async function moveStop(
    button: HTMLButtonElement
): Promise<void> {

    const stopId =
        button.dataset.stopId;


    const direction =
        button.dataset.direction;


    if (
        !stopId ||
        (
            direction !== "up" &&
            direction !== "down"
        )
    ) {
        return;
    }


    button.disabled =
        true;


    try {

        await moveAdminFutureStop(
            stopId,
            direction as
                AdminTripMoveDirection
        );


        await refresh();


        setMessage(
            "✅ Редът на бъдещите спирки е променен.",
            "success"
        );


    } catch (error) {

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );
    }
}


/* =========================================================
   REMOVE STOP
   ========================================================= */


async function removeStop(
    button: HTMLButtonElement
): Promise<void> {

    const stopId =
        button.dataset.stopId;


    if (!stopId) {
        return;
    }


    const found =
        findStop(
            stopId
        );


    if (!found) {
        return;
    }


    if (
        found.stop.status !==
        "waiting"
    ) {

        setMessage(
            "Само бъдеща спирка може да бъде премахната.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Да премахнем ли "${found.stop.companyName}" от активния курс?\n\nЗачисляването към този камион ще бъде освободено.`
        );


    if (!confirmed) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Премахване...";


    try {

        await removeAdminFutureStop(
            stopId
        );


        await refresh();


        setMessage(
            "✅ Бъдещата спирка е премахната и зачисляването е освободено.",
            "success"
        );


    } catch (error) {

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );


        button.disabled =
            false;


        button.textContent =
            "🗑️ Премахни";
    }
}


/* =========================================================
   ADD ORDER
   ========================================================= */


function renderAvailableOrderOptions():
string {

    return `
        <option value="">
            -- Избери заявка --
        </option>

        ${
            availableOrders
                .map(
                    order => `
                        <option
                            value="${escapeHtml(
                                order.id
                            )}"
                        >
                            #${escapeHtml(
                                order.orderNumber
                            )}
                            —
                            ${escapeHtml(
                                order.companyName
                            )}
                            —
                            ${escapeHtml(
                                formatTons(
                                    order.remainingTons
                                )
                            )}
                            т. остатък
                        </option>
                    `
                )
                .join("")
        }
    `;
}


async function openAddOrderDialog(
    tripId: string
): Promise<void> {

    const trip =
        findTrip(
            tripId
        );


    const dialog =
        getDialog();


    if (
        !trip ||
        !dialog
    ) {
        return;
    }


    dialog.dataset.tripId =
        tripId;


    dialog.innerHTML = `
        <div
            class="trip-action-loading"
        >
            Зареждане на свободните заявки...
        </div>
    `;


    if (!dialog.open) {
        dialog.showModal();
    }


    try {

        availableOrders =
            await loadAdminAvailableOrders(
                tripId
            );


        if (
            !dialog.open ||
            dialog.dataset.tripId !==
                tripId
        ) {
            return;
        }


        if (
            availableOrders.length ===
            0
        ) {

            dialog.innerHTML = `
                <div
                    class="trip-action-form"
                >

                    <header
                        class="trip-action-dialog-header"
                    >

                        <div>
                            <h3>
                                ➕ Добави заявка
                            </h3>

                            <p>
                                Курс
                                #${escapeHtml(
                                    trip.tripNumber
                                )}
                            </p>
                        </div>


                        <button
                            type="button"
                            class="trip-dialog-close"
                            data-trips-action="close-dialog"
                        >
                            ✕
                        </button>

                    </header>


                    <div
                        class="trip-action-empty"
                    >
                        Няма свободни заявки,
                        които могат да бъдат
                        добавени към този курс.
                    </div>

                </div>
            `;


            return;
        }


        dialog.innerHTML = `
            <form
                id="k3TripAddOrderForm"
                class="trip-action-form"
                data-trip-id="${escapeHtml(
                    tripId
                )}"
            >

                <header
                    class="trip-action-dialog-header"
                >

                    <div>
                        <h3>
                            ➕ Добави заявка
                        </h3>

                        <p>
                            Курс
                            #${escapeHtml(
                                trip.tripNumber
                            )}
                            •
                            ${escapeHtml(
                                trip.activeSegment
                                    ?.truckNumber ||
                                "-"
                            )}
                        </p>
                    </div>


                    <button
                        type="button"
                        class="trip-dialog-close"
                        data-trips-action="close-dialog"
                        aria-label="Затвори"
                    >
                        ✕
                    </button>

                </header>


                <div
                    class="trip-action-info"
                >
                    <span>
                        Свободен капацитет по курса
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                tripFreeTons(
                                    trip
                                )
                            )
                        )}
                        т.
                    </strong>
                </div>


                <label>
                    Заявка

                    <select
                        id="k3TripAddOrderSelect"
                        required
                    >
                        ${renderAvailableOrderOptions()}
                    </select>
                </label>


                <div
                    id="k3TripAddOrderDetails"
                    class="trip-add-order-details"
                >
                    Изберете заявка.
                </div>


                <label>
                    Тонаж за този камион

                    <input
                        id="k3TripAddOrderTons"
                        type="number"
                        min="0.001"
                        step="0.001"
                        inputmode="decimal"
                        required
                        disabled
                    />
                </label>


                <label>
                    Позиция в маршрута

                    <select
                        id="k3TripAddOrderPosition"
                        required
                    >

                        <option value="next">
                            След текущата спирка
                        </option>

                        <option value="last">
                            Последна спирка
                        </option>

                    </select>
                </label>


                <div
                    class="trip-action-warning"
                >
                    🚛 Driver / Truck / Trailer
                    не се избират оттук.
                    Backend-ът използва реалната
                    активна композиция на курса.
                </div>


                <button
                    id="k3TripAddOrderSubmit"
                    type="submit"
                    class="trip-action-primary"
                    disabled
                >
                    ➕ Добави към курса
                </button>

            </form>
        `;


    } catch (error) {

        dialog.innerHTML = `
            <div
                class="trip-action-form"
            >

                <header
                    class="trip-action-dialog-header"
                >

                    <h3>
                        ➕ Добави заявка
                    </h3>


                    <button
                        type="button"
                        class="trip-dialog-close"
                        data-trips-action="close-dialog"
                    >
                        ✕
                    </button>

                </header>


                <div
                    class="trip-action-error"
                >
                    ${escapeHtml(
                        errorMessage(
                            error
                        )
                    )}
                </div>

            </div>
        `;
    }
}


function updateAddOrderForm():
void {

    const dialog =
        getDialog();


    if (!dialog) {
        return;
    }


    const tripId =
        dialog.dataset.tripId;


    if (!tripId) {
        return;
    }


    const trip =
        findTrip(
            tripId
        );


    const select =
        dialog.querySelector<
            HTMLSelectElement
        >(
            "#k3TripAddOrderSelect"
        );


    const input =
        dialog.querySelector<
            HTMLInputElement
        >(
            "#k3TripAddOrderTons"
        );


    const details =
        dialog.querySelector<
            HTMLElement
        >(
            "#k3TripAddOrderDetails"
        );


    const submit =
        dialog.querySelector<
            HTMLButtonElement
        >(
            "#k3TripAddOrderSubmit"
        );


    if (
        !trip ||
        !select ||
        !input ||
        !details ||
        !submit
    ) {
        return;
    }


    const order =
        availableOrders.find(
            item =>
                item.id ===
                    select.value
        );


    if (!order) {

        input.value =
            "";

        input.disabled =
            true;

        submit.disabled =
            true;

        details.textContent =
            "Изберете заявка.";

        return;
    }


    const maxTons =
        Math.max(
            Math.min(
                order.remainingTons,
                tripFreeTons(
                    trip
                )
            ),
            0
        );


    details.innerHTML = `
        <strong>
            ${escapeHtml(
                order.companyName
            )}
        </strong>

        <span>
            📍
            ${escapeHtml(
                order.siteName
            )}
            —
            ${escapeHtml(
                order.address
            )}
        </span>

        <span>
            Заявени:
            ${escapeHtml(
                formatTons(
                    order.requestedTons
                )
            )}
            т.
        </span>

        <span>
            Свободен остатък:
            ${escapeHtml(
                formatTons(
                    order.remainingTons
                )
            )}
            т.
        </span>

        ${
            order.note

                ? `
                    <span>
                        📝
                        ${escapeHtml(
                            order.note
                        )}
                    </span>
                `

                : ""
        }
    `;


    if (
        maxTons <= 0
    ) {

        input.value =
            "";

        input.disabled =
            true;

        submit.disabled =
            true;

        return;
    }


    input.disabled =
        false;


    input.max =
        String(
            maxTons
        );


    input.value =
        formatTons(
            maxTons
        );


    submit.disabled =
        false;
}


async function submitAddOrder(
    form: HTMLFormElement
): Promise<void> {

    const tripId =
        form.dataset.tripId;


    const orderSelect =
        form.querySelector<
            HTMLSelectElement
        >(
            "#k3TripAddOrderSelect"
        );


    const tonsInput =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3TripAddOrderTons"
        );


    const positionSelect =
        form.querySelector<
            HTMLSelectElement
        >(
            "#k3TripAddOrderPosition"
        );


    const submit =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3TripAddOrderSubmit"
        );


    if (
        !tripId ||
        !orderSelect ||
        !tonsInput ||
        !positionSelect ||
        !submit
    ) {
        return;
    }


    if (!orderSelect.value) {

        setMessage(
            "Изберете заявка.",
            "error"
        );

        return;
    }


    const tons =
        Number(
            tonsInput.value
        );


    if (
        !Number.isFinite(tons) ||
        tons <= 0
    ) {

        setMessage(
            "Въведете валиден тонаж.",
            "error"
        );

        return;
    }


    const mode =
        positionSelect.value;


    if (
        mode !== "next" &&
        mode !== "last"
    ) {
        return;
    }


    submit.disabled =
        true;


    submit.textContent =
        "Добавяне...";


    try {

        await addAdminOrderToTrip(
            tripId,
            orderSelect.value,
            tons,
            mode as
                AdminTripInsertMode
        );


        closeDialog();


        await refresh();


        setMessage(
            "✅ Заявката е добавена към активния курс.",
            "success"
        );


    } catch (error) {

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );


        submit.disabled =
            false;


        submit.textContent =
            "➕ Добави към курса";
    }
}


/* =========================================================
   EVENTS
   ========================================================= */


async function handleSubmit(
    event: Event
): Promise<void> {

    const form =
        event.target;


    if (
        !(form instanceof
            HTMLFormElement)
    ) {
        return;
    }


    if (
        form.id ===
        "k3TruckChangeForm"
    ) {

        event.preventDefault();


        await handleTruckChangeSubmit(
            form,
            getTruckChangeHost()
        );


        return;
    }


    if (
        form.id ===
        "k3TripEditLoadForm"
    ) {

        event.preventDefault();


        await submitEditLoad(
            form
        );


        return;
    }


    if (
        form.id ===
        "k3TripAddOrderForm"
    ) {

        event.preventDefault();


        await submitAddOrder(
            form
        );
    }
}


async function handleClick(
    event: Event
): Promise<void> {

    const target =
        event.target;


    if (
        !(target instanceof Element)
    ) {
        return;
    }


    const button =
        target.closest<
            HTMLButtonElement
        >(
            "[data-trips-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset
            .tripsAction;


    if (
        await handleTruckChangeClick(
            button,
            getTruckChangeHost()
        )
    ) {
        return;
    }


    if (
        action ===
        "refresh"
    ) {

        button.disabled =
            true;


        await refresh();


        button.disabled =
            false;


        return;
    }


    if (
        action ===
        "edit-load"
    ) {

        const stopId =
            button.dataset.stopId;


        if (stopId) {

            openEditLoadDialog(
                stopId
            );
        }


        return;
    }


    if (
        action ===
        "move-stop"
    ) {

        await moveStop(
            button
        );


        return;
    }


    if (
        action ===
        "remove-stop"
    ) {

        await removeStop(
            button
        );


        return;
    }


    if (
        action ===
        "add-order"
    ) {

        const tripId =
            button.dataset.tripId;


        if (tripId) {

            await openAddOrderDialog(
                tripId
            );
        }


        return;
    }


    if (
        action ===
        "close-dialog"
    ) {

        closeDialog();
    }
}


function handleChange(
    event: Event
): void {

    const target =
        event.target;


    if (
        handleTruckChangeFieldChange(
            target
        )
    ) {
        return;
    }


    if (
        target instanceof
            HTMLSelectElement &&
        target.id ===
            "k3TripAddOrderSelect"
    ) {

        updateAddOrderForm();
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function initializeSection():
Promise<void> {

    const root =
        getRoot();


    if (!root) {
        return;
    }


    root.addEventListener(
        "click",
        event => {
            void handleClick(
                event
            );
        }
    );


    root.addEventListener(
        "submit",
        event => {
            void handleSubmit(
                event
            );
        }
    );


    root.addEventListener(
        "change",
        handleChange
    );


    await refresh();


    startPolling();
}
