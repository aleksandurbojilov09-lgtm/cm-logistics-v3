import "./trips-section.css";

import {
    loadAdminActiveTrips,
    type AdminActiveTrip,
    type AdminActiveTripStop
} from "../../../features/trips/admin-trip-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


const MAX_TRUCK_TONS =
    24;


let trips:
    AdminActiveTrip[] =
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
                            маршрут и състояние на спирките.
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

        const activeStops =
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
                activeStops
            );
    }
}


/* =========================================================
   ROUTE
   ========================================================= */


function renderStop(
    stop: AdminActiveTripStop
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
        Math.max(
            MAX_TRUCK_TONS -
            load,
            0
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
                                    Изчаква се шофьорът
                                    да приключи курса.
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
                                    renderStop
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
                <span>
                    👁️ Този екран е само за наблюдение.
                </span>

                <span>
                    Редакциите на курса ще бъдат
                    защитени в следващия backend блок.
                </span>
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


        trips =
            nextTrips;


        setMessage(
            "",
            null
        );


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
   EVENTS
   ========================================================= */


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
        action === "refresh"
    ) {

        button.disabled =
            true;


        await refresh();


        button.disabled =
            false;
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


    await refresh();


    startPolling();
}
