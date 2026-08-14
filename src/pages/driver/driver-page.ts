import "./driver-page.css";

import {
    finishDriverTrip,
    loadDriverTripState,
    markDriverStopLoaded,
    startDriverTrip,
    type DriverStop,
    type DriverTripState
} from "../../features/trips/driver-trip-service";

import {
    logoutCurrentSession
} from "../../features/auth/logout";

import {
    escapeHtml
} from "../../shared/lib/html";

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
            state.assignedStops[0];


        container.innerHTML = `
            <header
                class="driver-panel-header"
            >
                <div>
                    <h2>
                        🚛 Старт на курс
                    </h2>

                    <p>
                        Въведи километража
                        преди потегляне.
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
                            class="driver-current-actions"
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


                            <button
                                type="button"
                                class="driver-loaded-button"
                                data-driver-action="loaded"
                                data-stop-id="${escapeHtml(
                                    active.id || ""
                                )}"
                            >
                                ✅ Натоварих
                            </button>

                        </div>

                    </div>
                `

                : ""
        }


        ${
            loaded

                ? `
                    <div
                        class="driver-finished-clients"
                    >
                        <strong>
                            ✅ Всички фирми са натоварени
                        </strong>

                        <p>
                            Продължи до крайната
                            точка и въведи крайния
                            километраж.
                        </p>
                    </div>


                    <form
                        id="k3DriverFinishForm"
                        class="driver-control-form"
                    >

                        <label>
                            Краен километраж

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
   STOPS LIST
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
                                                class="driver-navigation-button driver-navigation-small"
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
   REFRESH
   ========================================================= */


async function refresh():
Promise<void> {

    const version =
        ++refreshVersion;


    try {

        const nextState =
            await loadDriverTripState();


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


        renderSummary();

        renderTripControl();

        renderStops();

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


/* =========================================================
   START
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


    const startKm =
        Number(
            input.value
        );


    button.disabled =
        true;

    button.textContent =
        "Стартиране...";


    try {

        await startDriverTrip(
            startKm
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


    const endKm =
        Number(
            input.value
        );


    button.disabled =
        true;

    button.textContent =
        "Приключване...";


    try {

        await finishDriverTrip(
            endKm
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


    await refresh();
}
