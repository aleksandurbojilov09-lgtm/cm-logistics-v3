import "./driver-page.css";
import "./driver-interactions.css";
import "./driver-truck-change.css";

import {
    finishDriverTrip,
    loadDriverTripState,
    markDriverStopLoaded,
    startDriverTrip,
    type DriverStop,
    type DriverTripState
} from "../../features/trips/driver-trip-service";

import {
    loadDriverInteractions,
    reportDriverDiscrepancy,
    sendDriverEtaBeforeStart,
    sendDriverEtaCurrent,
    type DriverInteraction
} from "../../features/trips/driver-interaction-service";

import {
    confirmDriverTruckChange,
    loadDriverTruckChange,
    type DriverTruckChange
} from "../../features/trips/driver-truck-change-service";

import {
    FIXED_LOCATION_CODES,
    type FixedLocation
} from "../../entities/location/fixed-location";

import {
    findFixedLocation,
    loadFixedLocations
} from "../../entities/location/fixed-location-service";

import {
    addDriverFixedLocationsToMap,
    renderDriverDestinationPanel
} from "./driver-destination";

import {
    logoutCurrentSession
} from "../../features/auth/logout";

import {
    escapeHtml
} from "../../shared/lib/html";

import {
    isUserEditing
} from "../../shared/lib/user-editing";

import {
    buildGoogleMapsNavigationUrl
} from "../../shared/lib/google-maps";

import {
    loadLeaflet,
    type LeafletLayerGroup,
    type LeafletMap,
    type LeafletNamespace
} from "../../shared/lib/leaflet-loader";


let state:
    DriverTripState | null =
    null;


let interactions:
    DriverInteraction[] =
    [];


let pendingTruckChange:
    DriverTruckChange | null =
    null;


let fixedLocations:
    FixedLocation[] =
    [];


let renderedTruckChangeRequestId:
    string | null =
    null;


let map:
    LeafletMap | null =
    null;


let routeLayer:
    LeafletLayerGroup | null =
    null;


let leaflet:
    LeafletNamespace | null =
    null;


let refreshVersion =
    0;


let interactionTimer:
    number | null =
    null;


/* =========================================================
   PAGE
   ========================================================= */


export function renderPage():
string {

    return `
        <div
            id="k3DriverPortal"
            class="driver-portal"
        >

            <header
                class="driver-topbar"
            >

                <div
                    class="driver-brand"
                >
                    <div
                        class="driver-logo"
                    >
                        K3
                    </div>

                    <div>
                        <strong>
                            K3 Logistics
                        </strong>

                        <span>
                            Driver Portal
                        </span>
                    </div>
                </div>


                <button
                    type="button"
                    class="driver-logout"
                    data-driver-action="logout"
                >
                    Изход
                </button>

            </header>


            <main
                class="driver-main"
            >

                <div
                    id="k3DriverMessage"
                    class="driver-message"
                    aria-live="polite"
                ></div>


                <section
                    class="driver-summary"
                >

                    <div
                        class="driver-summary-card"
                    >
                        <span>
                            Шофьор
                        </span>

                        <strong
                            id="k3DriverName"
                        >
                            -
                        </strong>
                    </div>


                    <div
                        class="driver-summary-card"
                    >
                        <span>
                            Композиция
                        </span>

                        <strong
                            id="k3DriverComposition"
                        >
                            -
                        </strong>
                    </div>


                    <div
                        class="driver-summary-card"
                    >
                        <span>
                            Спирки
                        </span>

                        <strong
                            id="k3DriverStopsCount"
                        >
                            0
                        </strong>
                    </div>


                    <div
                        class="driver-summary-card"
                    >
                        <span>
                            Товар
                        </span>

                        <strong
                            id="k3DriverTotalTons"
                        >
                            0 т.
                        </strong>
                    </div>

                </section>


                <section
                    id="k3DriverTripControl"
                    class="driver-panel"
                >
                    <div
                        class="driver-loading"
                    >
                        Зареждане...
                    </div>
                </section>


                <div
                    class="driver-route-grid"
                >

                    <section
                        class="driver-panel"
                    >

                        <header
                            class="driver-panel-header"
                        >
                            <div>
                                <h2>
                                    🗺️ Маршрут
                                </h2>

                                <p>
                                    Натисни обект за
                                    информация и навигация.
                                </p>
                            </div>
                        </header>


                        <div
                            id="k3DriverMap"
                            class="driver-map"
                        >
                            <div
                                class="driver-loading"
                            >
                                Зареждане на картата...
                            </div>
                        </div>

                    </section>


                    <section
                        class="driver-panel"
                    >

                        <header
                            class="driver-panel-header"
                        >
                            <div>
                                <h2>
                                    📍 Спирки
                                </h2>

                                <p>
                                    Подредени по реда
                                    на курса.
                                </p>
                            </div>
                        </header>


                        <div
                            id="k3DriverStopsList"
                            class="driver-stops-list"
                        >
                            <div
                                class="driver-loading"
                            >
                                Зареждане...
                            </div>
                        </div>

                    </section>

                </div>

            </main>


            <dialog
                id="k3DriverDiscrepancyDialog"
                class="driver-discrepancy-dialog"
            >

                <form
                    id="k3DriverDiscrepancyForm"
                    class="driver-discrepancy-form"
                >

                    <header
                        class="driver-discrepancy-header"
                    >

                        <div>
                            <h2>
                                ⚠️ Несъответствие
                            </h2>

                            <p
                                id="k3DriverDiscrepancyCompany"
                            >
                                -
                            </p>
                        </div>


                        <button
                            type="button"
                            class="driver-dialog-close"
                            data-driver-action="close-discrepancy"
                            aria-label="Затвори"
                        >
                            ✕
                        </button>

                    </header>


                    <div
                        class="driver-discrepancy-assigned"
                    >
                        <span>
                            Зачислен товар
                        </span>

                        <strong
                            id="k3DriverDiscrepancyAssigned"
                        >
                            -
                        </strong>
                    </div>


                    <label>
                        Реално натоварени тонове

                        <input
                            id="k3DriverActualLoadedTons"
                            type="number"
                            min="0"
                            step="0.1"
                            required
                            inputmode="decimal"
                        />
                    </label>


                    <label>
                        Бележка

                        <small>
                            (по желание)
                        </small>

                        <textarea
                            id="k3DriverDiscrepancyNote"
                            rows="4"
                            placeholder="Напр. зачислени са 12 т., но реално са 9.5 т."
                        ></textarea>
                    </label>


                    <div
                        id="k3DriverDifferencePreview"
                        class="driver-difference-preview"
                    ></div>


                    <button
                        id="k3DriverDiscrepancySubmit"
                        type="submit"
                        class="driver-discrepancy-submit"
                    >
                        ⚠️ Изпрати сигнал
                    </button>

                </form>

            </dialog>

        </div>
    `;
}


/* =========================================================
   HELPERS
   ========================================================= */


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
            "#k3DriverMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;

    element.className =
        "driver-message";


    if (type) {
        element.classList.add(
            `driver-message-${type}`
        );
    }
}


function displayedStops():
DriverStop[] {

    if (!state) {
        return [];
    }


    if (
        state.hasActiveTrip &&
        state.trip
    ) {
        return state.trip.stops;
    }


    return state.assignedStops;
}


function currentStop():
DriverStop | null {

    if (
        !state?.hasActiveTrip ||
        !state.trip
    ) {
        return null;
    }


    return (
        state.trip.stops.find(
            stop =>
                stop.status ===
                "en_route"
        ) ||
        null
    );
}


function allStopsLoaded():
boolean {

    if (
        !state?.hasActiveTrip ||
        !state.trip ||
        state.trip.stops.length === 0
    ) {
        return false;
    }


    return state.trip.stops.every(
        stop =>
            stop.status ===
            "loaded"
    );
}


function navigationUrl(
    stop: DriverStop
): string | null {

    if (
        stop.latitude === null ||
        stop.longitude === null
    ) {
        return null;
    }


    return buildGoogleMapsNavigationUrl(
        stop.latitude,
        stop.longitude
    );
}


function interactionByAssignment(
    assignmentId:
        string | null
): DriverInteraction | null {

    if (!assignmentId) {
        return null;
    }


    return (
        interactions.find(
            item =>
                item.assignmentId ===
                    assignmentId
        ) ||
        null
    );
}


function interactionByStop(
    stopId:
        string | null
): DriverInteraction | null {

    if (!stopId) {
        return null;
    }


    return (
        interactions.find(
            item =>
                item.stopId ===
                    stopId
        ) ||
        null
    );
}


function etaStatusHtml(
    interaction:
        DriverInteraction | null
): string {

    if (
        !interaction?.etaSentAt
    ) {
        return `
            <div
                class="
                    driver-confirmation-status
                    driver-confirmation-idle
                "
            >
                🔔 Известието още не е изпратено.
            </div>
        `;
    }


    if (
        interaction.etaConfirmed
    ) {
        return `
            <div
                class="
                    driver-confirmation-status
                    driver-confirmation-confirmed
                "
            >
                ✅ Клиентът потвърди известието.
            </div>
        `;
    }


    return `
        <div
            class="
                driver-confirmation-status
                driver-confirmation-waiting
            "
        >
            ⏳ Известието е изпратено.
            Изчаква потвърждение от клиента.
        </div>
    `;
}


function discrepancyStatusHtml(
    interaction:
        DriverInteraction | null
): string {

    if (
        !interaction?.discrepancyId
    ) {
        return "";
    }


    const actual =
        interaction.actualLoadedTons ??
        0;


    const difference =
        interaction.differenceTons ??
        0;


    const sign =
        difference > 0
            ? "+"
            : "";


    const reviewed =
        interaction.discrepancyStatus ===
        "reviewed";


    return `
        <div
            class="
                driver-discrepancy-status
                ${
                    reviewed
                        ? "driver-discrepancy-reviewed"
                        : ""
                }
            "
        >

            <strong>
                ⚠️ Несъответствието е изпратено
            </strong>

            <span>
                Реално:
                ${escapeHtml(
                    formatTons(
                        actual
                    )
                )}
                т.
                •
                Разлика:
                ${escapeHtml(
                    `${sign}${formatTons(
                        difference
                    )}`
                )}
                т.
            </span>

            <small>
                ${
                    reviewed
                        ? "✅ Прегледано от администрацията"
                        : "⏳ Очаква преглед"
                }
            </small>

        </div>
    `;
}


function stopStateLabel(
    stop: DriverStop,
    index: number
): string {

    if (
        stop.status ===
        "loaded"
    ) {
        return "✅ Натоварено";
    }


    if (
        stop.status ===
        "en_route"
    ) {
        return "🚛 Текуща спирка";
    }


    if (
        stop.status ===
        "waiting"
    ) {
        return "⏳ Предстои";
    }


    if (index === 0) {
        return "🔵 Първа спирка";
    }


    return "⏳ Зачислено";
}


/* =========================================================
   SUMMARY
   ========================================================= */


function renderSummary():
void {

    if (!state) {
        return;
    }


    const name =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverName"
        );


    const composition =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverComposition"
        );


    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverStopsCount"
        );


    const tons =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverTotalTons"
        );


    if (name) {
        name.textContent =
            state.driverName ||
            "-";
    }


    if (composition) {

        const activeSegment =
            state.trip
                ?.activeSegment;


        if (activeSegment) {

            composition.textContent =
                [
                    activeSegment
                        .truckNumber,

                    activeSegment
                        .trailerNumber
                ]
                    .filter(Boolean)
                    .join(" • ");

        } else if (
            state.composition
        ) {

            composition.textContent =
                [
                    state.composition
                        .truckNumber,

                    state.composition
                        .trailerNumber
                ]
                    .filter(Boolean)
                    .join(" • ");

        } else {

            composition.textContent =
                "Няма готова композиция";
        }
    }


    const stops =
        displayedStops();


    if (count) {
        count.textContent =
            String(
                stops.length
            );
    }


    if (tons) {

        const total =
            stops.reduce(
                (
                    sum,
                    stop
                ) =>
                    sum +
                    stop.assignedTons,
                0
            );


        tons.textContent =
            `${formatTons(
                total
            )} т.`;
    }
}


/* =========================================================
   TRIP CONTROL
   ========================================================= */


function renderTripControl():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverTripControl"
        );


    if (
        !container ||
        !state
    ) {
        return;
    }


    if (!state.hasActiveTrip) {

        const firstStop =
            state.assignedStops[0] ||
            null;


        const firstInteraction =
            firstStop

                ? interactionByAssignment(
                    firstStop.assignmentId
                )

                : null;


        const etaAlreadySent =
            Boolean(
                firstInteraction
                    ?.etaSentAt
            );


        container.innerHTML = `
            <header
                class="driver-panel-header"
            >

                <div>
                    <h2>
                        🚛 Старт на курс
                    </h2>

                    <p>
                        Преди потегляне можеш
                        да уведомиш само първата фирма.
                    </p>
                </div>


                <span
                    class="
                        driver-trip-badge
                        driver-trip-waiting
                    "
                >
                    ⏳ Изчаква
                </span>

            </header>


            ${
                firstStop

                    ? `
                        <div
                            class="driver-first-stop"
                        >

                            <span>
                                Първа спирка
                            </span>

                            <strong>
                                ${escapeHtml(
                                    firstStop.companyName
                                )}
                            </strong>

                            <div>
                                📍
                                ${escapeHtml(
                                    firstStop.siteName
                                )}
                                —
                                ${escapeHtml(
                                    firstStop.address
                                )}
                            </div>

                            <div>
                                ⚖️
                                ${escapeHtml(
                                    formatTons(
                                        firstStop.assignedTons
                                    )
                                )}
                                т.
                            </div>


                            <button
                                type="button"
                                class="driver-eta-button"
                                data-driver-action="eta-before-start"
                                data-assignment-id="${escapeHtml(
                                    firstStop.assignmentId ||
                                    ""
                                )}"
                                ${
                                    !firstStop.assignmentId ||
                                    etaAlreadySent

                                        ? "disabled"

                                        : ""
                                }
                            >
                                ${
                                    etaAlreadySent

                                        ? "🔔 Известието е изпратено"

                                        : "🔔 Пристигам след около 1 час"
                                }
                            </button>


                            ${etaStatusHtml(
                                firstInteraction
                            )}

                        </div>
                    `

                    : ""
            }


            <form
                id="k3DriverStartForm"
                class="driver-control-form"
            >

                <label>
                    Начален километраж

                    <input
                        id="k3DriverStartKm"
                        type="number"
                        min="0"
                        step="1"
                        inputmode="numeric"
                        required
                        placeholder="Напр. 356420"
                    />
                </label>


                <button
                    type="submit"
                    class="driver-primary-button"
                    ${
                        state.assignedStops.length === 0 ||
                        !state.composition

                            ? "disabled"

                            : ""
                    }
                >
                    🚛 Започни курс
                </button>

            </form>


            ${
                !state.composition

                    ? `
                        <div
                            class="driver-warning"
                        >
                            ⚠️ Нямаш готова
                            активна композиция.
                        </div>
                    `

                    : state.assignedStops.length === 0

                        ? `
                            <div
                                class="driver-warning"
                            >
                                Нямаш зачислени товари.
                            </div>
                        `

                        : ""
            }
        `;


        return;
    }


    const trip =
        state.trip;


    if (!trip) {
        return;
    }


    const active =
        currentStop();


    const loaded =
        allStopsLoaded();


    const isFirstActiveStop =
        Boolean(
            active &&
            trip.stops[0]?.id ===
                active.id
        );


    const activeInteraction =
        active

            ? interactionByStop(
                active.id
            )

            : null;


    const etaAlreadySent =
        Boolean(
            activeInteraction
                ?.etaSentAt
        );


    const discrepancyAlreadySent =
        Boolean(
            activeInteraction
                ?.discrepancyId
        );


    container.innerHTML = `
        <header
            class="driver-panel-header"
        >

            <div>
                <h2>
                    🚛 Курс
                    #${escapeHtml(
                        trip.tripNumber
                    )}
                </h2>

                <p>
                    ${
                        trip.activeSegment

                            ? `Начален км: ${escapeHtml(
                                String(
                                    trip.activeSegment
                                        .startKm
                                )
                            )}`

                            : ""
                    }
                </p>
            </div>


            <span
                class="
                    driver-trip-badge
                    driver-trip-active
                "
            >
                ● Активен
            </span>

        </header>


        ${
            active

                ? `
                    <div
                        class="driver-current-stop"
                    >

                        <span>
                            Текуща спирка
                        </span>

                        <h3>
                            ${escapeHtml(
                                active.companyName
                            )}
                        </h3>

                        <strong>
                            📍
                            ${escapeHtml(
                                active.siteName
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                active.address
                            )}
                        </p>


                        <div
                            class="driver-current-tons"
                        >
                            ⚖️
                            ${escapeHtml(
                                formatTons(
                                    active.assignedTons
                                )
                            )}
                            т.
                        </div>


                        <div
                            class="
                                driver-current-actions
                                ${
                                    isFirstActiveStop
                                        ? "driver-current-actions-three"
                                        : "driver-current-actions-four"
                                }
                            "
                        >

                            ${
                                navigationUrl(active)

                                    ? `
                                        <a
                                            href="${escapeHtml(
                                                navigationUrl(
                                                    active
                                                ) || ""
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="driver-navigation-button"
                                        >
                                            🧭 Google Maps
                                        </a>
                                    `

                                    : ""
                            }


                            ${
                                !isFirstActiveStop

                                    ? `
                                        <button
                                            type="button"
                                            class="driver-eta-button"
                                            data-driver-action="eta-current"
                                            data-stop-id="${escapeHtml(
                                                active.id ||
                                                ""
                                            )}"
                                            ${
                                                etaAlreadySent
                                                    ? "disabled"
                                                    : ""
                                            }
                                        >
                                            ${
                                                etaAlreadySent
                                                    ? "🔔 Изпратено"
                                                    : "🔔 ~1 час"
                                            }
                                        </button>
                                    `

                                    : ""
                            }


                            <button
                                type="button"
                                class="driver-discrepancy-button"
                                data-driver-action="open-discrepancy"
                                data-stop-id="${escapeHtml(
                                    active.id ||
                                    ""
                                )}"
                                ${
                                    discrepancyAlreadySent
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    discrepancyAlreadySent
                                        ? "⚠️ Изпратено"
                                        : "⚠️ Несъответствие"
                                }
                            </button>


                            <button
                                type="button"
                                class="driver-loaded-button"
                                data-driver-action="loaded"
                                data-stop-id="${escapeHtml(
                                    active.id ||
                                    ""
                                )}"
                            >
                                ✅ Натоварих
                            </button>

                        </div>


                        ${
                            !isFirstActiveStop

                                ? etaStatusHtml(
                                    activeInteraction
                                )

                                : ""
                        }


                        ${discrepancyStatusHtml(
                            activeInteraction
                        )}

                    </div>
                `

                : ""
        }


        ${
            loaded

                ? `
                    ${renderDriverDestinationPanel(
                        findFixedLocation(
                            fixedLocations,
                            FIXED_LOCATION_CODES.BIOEXIS
                        )
                    )}


                    <form
                        id="k3DriverFinishForm"
                        class="driver-control-form"
                    >

                        <label>
                            Краен километраж в BIOEXIS

                            <input
                                id="k3DriverEndKm"
                                type="number"
                                min="${escapeHtml(
                                    String(
                                        trip.activeSegment
                                            ?.startKm ||
                                        0
                                    )
                                )}"
                                step="1"
                                inputmode="numeric"
                                required
                            />
                        </label>


                        <button
                            type="submit"
                            class="
                                driver-primary-button
                                driver-finish-button
                            "
                        >
                            🏁 Завърши курс
                        </button>

                    </form>
                `

                : ""
        }
    `;
}


/* =========================================================
   STOPS
   ========================================================= */


function renderStops():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverStopsList"
        );


    if (!container) {
        return;
    }


    const stops =
        displayedStops();


    if (
        stops.length === 0
    ) {

        container.innerHTML = `
            <div
                class="driver-empty"
            >
                Няма зачислени товари.
            </div>
        `;

        return;
    }


    container.innerHTML =
        stops
            .map(
                (
                    stop,
                    index
                ) => {

                    const mapsUrl =
                        navigationUrl(
                            stop
                        );


                    return `
                        <article
                            class="
                                driver-stop-card
                                driver-stop-${escapeHtml(
                                    stop.status
                                )}
                            "
                        >

                            <div
                                class="driver-stop-number"
                            >
                                ${
                                    stop.stopNumber ||
                                    index + 1
                                }
                            </div>


                            <div
                                class="driver-stop-content"
                            >

                                <div
                                    class="driver-stop-heading"
                                >

                                    <div>
                                        <strong>
                                            ${escapeHtml(
                                                stop.companyName
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                stopStateLabel(
                                                    stop,
                                                    index
                                                )
                                            )}
                                        </span>
                                    </div>


                                    <strong
                                        class="driver-stop-tons"
                                    >
                                        ${escapeHtml(
                                            formatTons(
                                                stop.assignedTons
                                            )
                                        )}
                                        т.
                                    </strong>

                                </div>


                                <div
                                    class="driver-stop-site"
                                >
                                    📍
                                    ${escapeHtml(
                                        stop.siteName
                                    )}

                                    <br>

                                    ${escapeHtml(
                                        stop.address
                                    )}
                                </div>


                                ${
                                    stop.contactPerson

                                        ? `
                                            <div
                                                class="driver-stop-meta"
                                            >
                                                👤
                                                ${escapeHtml(
                                                    stop.contactPerson
                                                )}
                                            </div>
                                        `

                                        : ""
                                }


                                ${
                                    stop.phone

                                        ? `
                                            <a
                                                href="tel:${escapeHtml(
                                                    stop.phone
                                                )}"
                                                class="driver-phone"
                                            >
                                                📞
                                                ${escapeHtml(
                                                    stop.phone
                                                )}
                                            </a>
                                        `

                                        : ""
                                }


                                ${
                                    stop.note

                                        ? `
                                            <div
                                                class="driver-stop-note"
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
                                    mapsUrl

                                        ? `
                                            <a
                                                href="${escapeHtml(
                                                    mapsUrl
                                                )}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="
                                                    driver-navigation-button
                                                    driver-navigation-small
                                                "
                                            >
                                                🧭 Навигирай с Google Maps
                                            </a>
                                        `

                                        : `
                                            <div
                                                class="driver-gps-missing"
                                            >
                                                ⚠️ Липсват GPS координати
                                            </div>
                                        `
                                }

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   MAP
   ========================================================= */


function markerClass(
    stop: DriverStop,
    index: number
): string {

    if (
        stop.status ===
        "loaded"
    ) {
        return "driver-map-marker-loaded";
    }


    if (
        stop.status ===
        "en_route"
    ) {
        return "driver-map-marker-current";
    }


    if (
        stop.status ===
            "assigned" &&
        index === 0
    ) {
        return "driver-map-marker-first";
    }


    return "driver-map-marker-waiting";
}


async function renderMap():
Promise<void> {

    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverMap"
        );


    if (!element) {
        return;
    }


    try {

        leaflet =
            leaflet ||
            await loadLeaflet();


        if (map) {
            map.remove();

            map =
                null;
        }


        element.innerHTML =
            "";


        map =
            leaflet
                .map(
                    element
                )
                .setView(
                    [
                        42.2,
                        23.0
                    ],
                    7
                );


        leaflet
            .tileLayer(
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom:
                        19,

                    attribution:
                        "&copy; OpenStreetMap contributors"
                }
            )
            .addTo(
                map
            );


        routeLayer =
            leaflet
                .layerGroup()
                .addTo(
                    map
                );


        const points:
            [
                number,
                number
            ][] =
            [];


        points.push(
            ...addDriverFixedLocationsToMap(
                leaflet,
                routeLayer,
                fixedLocations
            )
        );


        const stops =
            displayedStops();


        stops.forEach(
            (
                stop,
                index
            ) => {

                if (
                    stop.latitude ===
                        null ||
                    stop.longitude ===
                        null
                ) {
                    return;
                }


                const coordinates:
                    [
                        number,
                        number
                    ] =
                    [
                        stop.latitude,
                        stop.longitude
                    ];


                points.push(
                    coordinates
                );


                const icon =
                    leaflet?.divIcon({
                        className:
                            "",

                        html:
                            `
                                <div
                                    class="
                                        driver-map-marker
                                        ${markerClass(
                                            stop,
                                            index
                                        )}
                                    "
                                >
                                    ${
                                        stop.stopNumber ||
                                        index + 1
                                    }
                                </div>
                            `,

                        iconSize:
                            [
                                44,
                                44
                            ],

                        iconAnchor:
                            [
                                22,
                                22
                            ],

                        popupAnchor:
                            [
                                0,
                                -20
                            ]
                    });


                if (
                    !icon ||
                    !leaflet ||
                    !routeLayer
                ) {
                    return;
                }


                const mapsUrl =
                    navigationUrl(
                        stop
                    );


                const popup =
                    `
                        <div
                            class="driver-map-popup"
                        >

                            <strong>
                                ${escapeHtml(
                                    stop.companyName
                                )}
                            </strong>

                            <div>
                                📍
                                ${escapeHtml(
                                    stop.siteName
                                )}
                            </div>

                            <div>
                                ${escapeHtml(
                                    stop.address
                                )}
                            </div>

                            <div>
                                ⚖️
                                ${escapeHtml(
                                    formatTons(
                                        stop.assignedTons
                                    )
                                )}
                                т.
                            </div>

                            ${
                                mapsUrl

                                    ? `
                                        <a
                                            href="${escapeHtml(
                                                mapsUrl
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            🧭 Навигирай с Google Maps
                                        </a>
                                    `

                                    : ""
                            }

                        </div>
                    `;


                leaflet
                    .marker(
                        coordinates,
                        {
                            icon,

                            title:
                                stop.companyName,

                            alt:
                                `Спирка ${
                                    stop.stopNumber ||
                                    index + 1
                                }`
                        }
                    )
                    .addTo(
                        routeLayer
                    )
                    .bindPopup(
                        popup
                    );
            }
        );


        if (
            map &&
            points.length > 0
        ) {

            map.fitBounds(
                points,
                {
                    padding:
                        [
                            45,
                            45
                        ],

                    maxZoom:
                        14
                }
            );
        }


        window.setTimeout(
            () => {
                map?.invalidateSize();
            },
            100
        );


    } catch (error) {

        element.innerHTML = `
            <div
                class="driver-map-error"
            >
                Картата не можа да се зареди.

                <br>

                Бутоните за Google Maps
                в списъка продължават да работят.
            </div>
        `;


        console.error(
            error
        );
    }
}


/* =========================================================
   TRUCK CHANGE
   ========================================================= */


function truckChangeModeLabel(
    request: DriverTruckChange
): string {

    return request.changeMode ===
        "permanent"
        ? "Постоянна промяна"
        : "Само за този курс";
}


function truckChangeModeDescription(
    request: DriverTruckChange
): string {

    return request.changeMode ===
        "permanent"

        ? "След края на курса новата композиция остава активна."

        : "Смяната е временна. След края на курса композицията се възстановява автоматично.";
}


function ensureTruckChangeDialog():
HTMLDialogElement | null {

    const root =
        document.querySelector<HTMLElement>(
            "#k3DriverPortal"
        );

    if (!root) {
        return null;
    }


    let dialog =
        document.querySelector<HTMLDialogElement>(
            "#k3DriverTruckChangeDialog"
        );


    if (dialog) {
        return dialog;
    }


    dialog =
        document.createElement(
            "dialog"
        );

    dialog.id =
        "k3DriverTruckChangeDialog";

    dialog.className =
        "driver-truck-change-dialog";


    dialog.addEventListener(
        "cancel",
        event => {
            event.preventDefault();
        }
    );


    root.append(
        dialog
    );

    return dialog;
}


function setTruckChangeMessage(
    message: string
): void {

    const element =
        document.querySelector<HTMLElement>(
            "#k3DriverTruckChangeMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    if (message) {
        element.dataset.status =
            "error";
    } else {
        delete element.dataset.status;
    }
}


function renderTruckChangeDialog():
void {

    const dialog =
        ensureTruckChangeDialog();

    if (!dialog) {
        return;
    }


    const request =
        pendingTruckChange;


    if (!request) {

        renderedTruckChangeRequestId =
            null;

        if (dialog.open) {
            dialog.close();
        }

        dialog.innerHTML =
            "";

        return;
    }


    if (
        renderedTruckChangeRequestId ===
            request.id &&
        dialog.open
    ) {
        return;
    }


    renderedTruckChangeRequestId =
        request.id;


    const temporary =
        request.changeMode ===
        "temporary_for_trip";


    dialog.innerHTML = `
        <form
            id="k3DriverTruckChangeForm"
            class="driver-truck-change-card"
        >
            <header
                class="driver-truck-change-header"
            >
                <div>🔄</div>

                <h2>
                    Смяна на камион
                </h2>

                <p>
                    Администраторът е задал нов камион.
                    Въведи двата километража.
                </p>
            </header>


            <div
                class="driver-truck-change-body"
            >
                <div
                    class="
                        driver-truck-change-mode
                        ${
                            temporary
                                ? "driver-truck-change-temporary"
                                : "driver-truck-change-permanent"
                        }
                    "
                >
                    <span>
                        Вид на смяната
                    </span>

                    <strong>
                        ${
                            temporary
                                ? "🔁"
                                : "🔒"
                        }
                        ${escapeHtml(
                            truckChangeModeLabel(
                                request
                            )
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            truckChangeModeDescription(
                                request
                            )
                        )}
                    </small>
                </div>


                <div
                    class="driver-truck-change-trucks"
                >
                    <div
                        class="
                            driver-truck-change-truck
                            driver-truck-change-old
                        "
                    >
                        <span>
                            Стар камион
                        </span>

                        <strong>
                            🚛
                            ${escapeHtml(
                                request.fromTruckNumber ||
                                "Стар камион"
                            )}
                        </strong>
                    </div>


                    <div
                        class="driver-truck-change-arrow"
                    >
                        →
                    </div>


                    <div
                        class="
                            driver-truck-change-truck
                            driver-truck-change-new
                        "
                    >
                        <span>
                            Нов камион
                        </span>

                        <strong>
                            🚛
                            ${escapeHtml(
                                request.toTruckNumber ||
                                "Нов камион"
                            )}
                        </strong>
                    </div>
                </div>


                ${
                    request.trailerNumber ||
                    request.positionNumber

                        ? `
                            <div
                                class="driver-truck-change-trailer"
                            >
                                <span>
                                    Ремаркето остава същото
                                </span>

                                <strong>
                                    🛻
                                    ${escapeHtml(
                                        request.trailerNumber ||
                                        "Ремарке"
                                    )}

                                    ${
                                        request.positionNumber

                                            ? ` • Позиция ${escapeHtml(
                                                request.positionNumber
                                            )}`

                                            : ""
                                    }
                                </strong>
                            </div>
                        `

                        : ""
                }


                <div
                    class="driver-truck-change-km"
                >
                    <label>
                        Краен километраж на
                        ${escapeHtml(
                            request.fromTruckNumber
                        )}

                        <input
                            id="k3OldTruckEndKm"
                            type="number"
                            min="${request.segmentStartKm}"
                            step="1"
                            inputmode="numeric"
                            required
                        />

                        <small>
                            Начало на отсечката:
                            ${escapeHtml(
                                request.segmentStartKm
                                    .toLocaleString(
                                        "bg-BG"
                                    )
                            )}
                            км
                        </small>
                    </label>


                    <label>
                        Начален километраж на
                        ${escapeHtml(
                            request.toTruckNumber
                        )}

                        <input
                            id="k3NewTruckStartKm"
                            type="number"
                            min="0"
                            step="1"
                            inputmode="numeric"
                            required
                        />
                    </label>
                </div>


                <div
                    id="k3DriverTruckChangeMessage"
                    class="driver-truck-change-message"
                    aria-live="polite"
                ></div>


                <button
                    type="submit"
                    class="driver-truck-change-submit"
                >
                    ✅ Потвърди смяната и продължи курса
                </button>
            </div>
        </form>
    `;


    if (!dialog.open) {
        dialog.showModal();
    }
}


async function submitTruckChange(
    form: HTMLFormElement
): Promise<void> {

    const request =
        pendingTruckChange;

    const oldKmInput =
        form.querySelector<HTMLInputElement>(
            "#k3OldTruckEndKm"
        );

    const newKmInput =
        form.querySelector<HTMLInputElement>(
            "#k3NewTruckStartKm"
        );

    const button =
        form.querySelector<HTMLButtonElement>(
            '[type="submit"]'
        );


    if (
        !request ||
        !oldKmInput ||
        !newKmInput ||
        !button
    ) {
        return;
    }


    const oldEndKm =
        Number(
            oldKmInput.value
        );

    const newStartKm =
        Number(
            newKmInput.value
        );


    if (
        !Number.isInteger(oldEndKm) ||
        oldEndKm <
            request.segmentStartKm
    ) {
        setTruckChangeMessage(
            `Крайният километраж не може да е под ${request.segmentStartKm.toLocaleString("bg-BG")} км.`
        );

        return;
    }


    if (
        !Number.isInteger(newStartKm) ||
        newStartKm < 0
    ) {
        setTruckChangeMessage(
            "Въведи валиден начален километраж на новия камион."
        );

        return;
    }


    setTruckChangeMessage(
        ""
    );


    button.disabled =
        true;

    button.textContent =
        "Потвърждаване...";


    try {

        await confirmDriverTruckChange(
            request.id,
            oldEndKm,
            newStartKm
        );


        await refresh();


        setMessage(
            `🔄 Камионът е сменен успешно с ${request.toTruckNumber}.`,
            "success"
        );


    } catch (error) {

        setTruckChangeMessage(
            errorMessage(
                error
            )
        );

        button.disabled =
            false;

        button.textContent =
            "✅ Потвърди смяната и продължи курса";
    }
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refresh():
Promise<void> {

    const version =
        ++refreshVersion;


    try {

        const [
            nextState,
            nextInteractions,
            nextTruckChange
        ] =
            await Promise.all([
                loadDriverTripState(),
                loadDriverInteractions(),
                loadDriverTruckChange()
            ]);


        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        const root =
            document.querySelector(
                "#k3DriverPortal"
            );


        if (!root?.isConnected) {
            return;
        }


        state =
            nextState;


        interactions =
            nextInteractions;


        pendingTruckChange =
            nextTruckChange;


        renderSummary();

        renderTripControl();

        renderStops();

        renderTruckChangeDialog();

        await renderMap();


    } catch (error) {

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );
    }
}


async function refreshInteractionsOnly():
Promise<void> {

    const root =
        document.querySelector(
            "#k3DriverPortal"
        );


    if (!root?.isConnected) {

        stopInteractionPolling();

        return;
    }


    try {

        const [
            nextInteractions,
            nextTruckChange
        ] =
            await Promise.all([
                loadDriverInteractions(),
                loadDriverTruckChange()
            ]);


        interactions =
            nextInteractions;


        pendingTruckChange =
            nextTruckChange;


        renderTripControl();


        renderTruckChangeDialog();


    } catch (error) {

        console.warn(
            "K3 Driver interaction refresh failed.",
            error
        );
    }
}


function startInteractionPolling():
void {

    stopInteractionPolling();


    interactionTimer =
        window.setInterval(
            () => {

                if (isUserEditing()) {
                    return;
                }


                void refreshInteractionsOnly();
            },
            5000
        );
}


function stopInteractionPolling():
void {

    if (
        interactionTimer !==
        null
    ) {

        window.clearInterval(
            interactionTimer
        );


        interactionTimer =
            null;
    }
}


/* =========================================================
   START TRIP
   ========================================================= */


async function submitStart(
    form: HTMLFormElement
): Promise<void> {

    const input =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverStartKm"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            '[type="submit"]'
        );


    if (
        !input ||
        !button
    ) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Стартиране...";


    try {

        await startDriverTrip(
            Number(
                input.value
            )
        );


        await refresh();


        setMessage(
            "🚛 Курсът е стартиран успешно.",
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
            "🚛 Започни курс";
    }
}


/* =========================================================
   LOADED
   ========================================================= */


async function markLoaded(
    button: HTMLButtonElement
): Promise<void> {

    const stopId =
        button.dataset.stopId;


    if (!stopId) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Записване...";


    try {

        const companyName =
            currentStop()
                ?.companyName ||
            "Спирката";


        await markDriverStopLoaded(
            stopId
        );


        await refresh();


        setMessage(
            `✅ ${companyName} е отбелязана като натоварена.`,
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
            "✅ Натоварих";
    }
}


/* =========================================================
   FINISH
   ========================================================= */


async function submitFinish(
    form: HTMLFormElement
): Promise<void> {

    const input =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverEndKm"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            '[type="submit"]'
        );


    if (
        !input ||
        !button
    ) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Приключване...";


    try {

        await finishDriverTrip(
            Number(
                input.value
            )
        );


        await refresh();


        setMessage(
            "🏁 Курсът е приключен успешно.",
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
            "🏁 Завърши курс";
    }
}


/* =========================================================
   ETA
   ========================================================= */


async function sendPreStartEta(
    button: HTMLButtonElement
): Promise<void> {

    const assignmentId =
        button.dataset.assignmentId;


    if (!assignmentId) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Изпращане...";


    try {

        await sendDriverEtaBeforeStart(
            assignmentId
        );


        await refreshInteractionsOnly();


        setMessage(
            "🔔 Клиентът е уведомен: пристигате след около 1 час.",
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
            "🔔 Пристигам след около 1 час";
    }
}


async function sendCurrentEta(
    button: HTMLButtonElement
): Promise<void> {

    const stopId =
        button.dataset.stopId;


    if (!stopId) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Изпращане...";


    try {

        await sendDriverEtaCurrent(
            stopId
        );


        await refreshInteractionsOnly();


        setMessage(
            "🔔 Клиентът е уведомен: пристигате след около 1 час.",
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
            "🔔 ~1 час";
    }
}


/* =========================================================
   DISCREPANCY
   ========================================================= */


function openDiscrepancyDialog(
    stopId: string
): void {

    const stop =
        currentStop();


    if (
        !stop ||
        stop.id !==
            stopId
    ) {
        return;
    }


    const interaction =
        interactionByStop(
            stopId
        );


    if (
        interaction?.discrepancyId
    ) {

        setMessage(
            "За тази спирка вече има подадено несъответствие.",
            "error"
        );

        return;
    }


    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3DriverDiscrepancyDialog"
        );


    const form =
        document.querySelector<
            HTMLFormElement
        >(
            "#k3DriverDiscrepancyForm"
        );


    const company =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverDiscrepancyCompany"
        );


    const assigned =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverDiscrepancyAssigned"
        );


    const actual =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3DriverActualLoadedTons"
        );


    const note =
        document.querySelector<
            HTMLTextAreaElement
        >(
            "#k3DriverDiscrepancyNote"
        );


    if (
        !dialog ||
        !form ||
        !company ||
        !assigned ||
        !actual ||
        !note
    ) {
        return;
    }


    form.dataset.stopId =
        stopId;


    form.dataset.assignedTons =
        String(
            stop.assignedTons
        );


    company.textContent =
        `${stop.companyName} — ${stop.siteName}`;


    assigned.textContent =
        `${formatTons(
            stop.assignedTons
        )} т.`;


    actual.value =
        String(
            stop.assignedTons
        );


    note.value =
        "";


    updateDifferencePreview();


    if (!dialog.open) {
        dialog.showModal();
    }
}


function closeDiscrepancyDialog():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3DriverDiscrepancyDialog"
        );


    if (
        dialog?.open
    ) {
        dialog.close();
    }
}


function updateDifferencePreview():
void {

    const form =
        document.querySelector<
            HTMLFormElement
        >(
            "#k3DriverDiscrepancyForm"
        );


    const input =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3DriverActualLoadedTons"
        );


    const preview =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverDifferencePreview"
        );


    if (
        !form ||
        !input ||
        !preview
    ) {
        return;
    }


    const assigned =
        Number(
            form.dataset.assignedTons ||
            0
        );


    const actual =
        Number(
            input.value
        );


    if (
        !Number.isFinite(actual) ||
        actual < 0
    ) {

        preview.textContent =
            "Въведете валидни реално натоварени тонове.";


        preview.className =
            "driver-difference-preview driver-difference-error";


        return;
    }


    const difference =
        actual -
        assigned;


    const sign =
        difference > 0
            ? "+"
            : "";


    preview.textContent =
        `Разлика: ${sign}${formatTons(
            difference
        )} т.`;


    preview.className =
        difference === 0

            ? "driver-difference-preview driver-difference-zero"

            : "driver-difference-preview driver-difference-alert";
}


async function submitDiscrepancy(
    form: HTMLFormElement
): Promise<void> {

    const stopId =
        form.dataset.stopId;


    const actual =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverActualLoadedTons"
        );


    const note =
        form.querySelector<
            HTMLTextAreaElement
        >(
            "#k3DriverDiscrepancyNote"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3DriverDiscrepancySubmit"
        );


    if (
        !stopId ||
        !actual ||
        !note ||
        !button
    ) {
        return;
    }


    const actualTons =
        Number(
            actual.value
        );


    if (
        !Number.isFinite(
            actualTons
        ) ||
        actualTons < 0
    ) {

        setMessage(
            "Въведете валидни реално натоварени тонове.",
            "error"
        );

        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Изпращане...";


    try {

        await reportDriverDiscrepancy(
            stopId,
            actualTons,
            note.value
        );


        closeDiscrepancyDialog();


        await refreshInteractionsOnly();


        setMessage(
            "⚠️ Несъответствието е изпратено успешно.",
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
            "⚠️ Изпрати сигнал";
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
        "k3DriverStartForm"
    ) {

        event.preventDefault();

        await submitStart(
            form
        );

        return;
    }


    if (
        form.id ===
        "k3DriverFinishForm"
    ) {

        event.preventDefault();

        await submitFinish(
            form
        );

        return;
    }


    if (
        form.id ===
        "k3DriverTruckChangeForm"
    ) {

        event.preventDefault();

        await submitTruckChange(
            form
        );

        return;
    }


    if (
        form.id ===
        "k3DriverDiscrepancyForm"
    ) {

        event.preventDefault();

        await submitDiscrepancy(
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
            "[data-driver-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset
            .driverAction;


    if (
        action ===
        "logout"
    ) {

        button.disabled =
            true;


        try {

            stopInteractionPolling();


            await logoutCurrentSession();


        } catch (error) {

            button.disabled =
                false;


            setMessage(
                errorMessage(
                    error
                ),
                "error"
            );
        }


        return;
    }


    if (
        action ===
        "loaded"
    ) {

        await markLoaded(
            button
        );

        return;
    }


    if (
        action ===
        "eta-before-start"
    ) {

        await sendPreStartEta(
            button
        );

        return;
    }


    if (
        action ===
        "eta-current"
    ) {

        await sendCurrentEta(
            button
        );

        return;
    }


    if (
        action ===
        "open-discrepancy"
    ) {

        const stopId =
            button.dataset.stopId;


        if (stopId) {
            openDiscrepancyDialog(
                stopId
            );
        }


        return;
    }


    if (
        action ===
        "close-discrepancy"
    ) {

        closeDiscrepancyDialog();
    }
}


function handleInput(
    event: Event
): void {

    const target =
        event.target;


    if (
        target instanceof
            HTMLInputElement &&
        target.id ===
            "k3DriverActualLoadedTons"
    ) {

        updateDifferencePreview();
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function initializePage():
Promise<void> {

    const root =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverPortal"
        );


    if (!root) {
        return;
    }


    root.addEventListener(
        "submit",
        event => {
            void handleSubmit(
                event
            );
        }
    );


    root.addEventListener(
        "click",
        event => {
            void handleClick(
                event
            );
        }
    );


    root.addEventListener(
        "input",
        handleInput
    );


    try {

        fixedLocations =
            await loadFixedLocations();

    } catch (error) {

        fixedLocations =
            [];

        setMessage(
            errorMessage(
                error
            ),
            "error"
        );
    }


    await refresh();


    startInteractionPolling();
}
