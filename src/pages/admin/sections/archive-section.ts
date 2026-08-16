import "./archive-section.css";


import {
    loadAdminDriverArchiveMonth,
    type AdminDriverArchiveMonth,
    type AdminDriverArchiveSegment
} from "../../../features/trips/admin-archive-service";


import {
    escapeHtml
} from "../../../shared/lib/html";


const BUSINESS_TIMEZONE =
    "Europe/Sofia";


let archiveMonth:
    AdminDriverArchiveMonth | null =
    null;


let selectedDriverId:
    string | null =
    null;


let selectedMonthStart =
    businessMonthStart();


let refreshVersion =
    0;


/* =========================================================
   TYPES
   ========================================================= */


type DriverArchiveView = {
    id: string;

    name: string;

    payableKm: number;

    tripCount: number;

    segmentCount: number;

    workDays: number;

    segments:
        AdminDriverArchiveSegment[];
};


/* =========================================================
   ROOT
   ========================================================= */


function getRoot():
HTMLElement | null {

    return document
        .querySelector<HTMLElement>(
            "#k3ArchiveSection"
        );
}


/* =========================================================
   DATES
   ========================================================= */


function businessMonthStart(
    date = new Date()
): string {

    const parts =
        new Intl.DateTimeFormat(
            "en",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                year:
                    "numeric",

                month:
                    "2-digit"
            }
        )
            .formatToParts(
                date
            );


    const year =
        parts.find(
            part =>
                part.type ===
                "year"
        )?.value ||
        "1970";


    const month =
        parts.find(
            part =>
                part.type ===
                "month"
        )?.value ||
        "01";


    return (
        `${year}-${month}-01`
    );
}


function shiftMonth(
    monthStart: string,
    delta: number
): string {

    const [
        year,
        month
    ] =
        monthStart
            .split("-")
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1 + delta,
                1,
                12
            )
        );


    return (
        `${date
            .getUTCFullYear()
            .toString()
            .padStart(
                4,
                "0"
            )}-${(
                date.getUTCMonth() +
                1
            )
                .toString()
                .padStart(
                    2,
                    "0"
                )}-01`
    );
}


function monthLabel(
    monthStart: string
): string {

    const date =
        new Date(
            `${monthStart}T12:00:00Z`
        );


    const label =
        new Intl.DateTimeFormat(
            "bg-BG",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                month:
                    "long",

                year:
                    "numeric"
            }
        )
            .format(
                date
            );


    return (
        label.charAt(0)
            .toUpperCase() +
        label.slice(1)
    );
}


function dayLabel(
    value: string
): string {

    const date =
        new Date(
            `${value}T12:00:00Z`
        );


    return (
        new Intl.DateTimeFormat(
            "bg-BG",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric",

                weekday:
                    "long"
            }
        )
            .format(
                date
            )
    );
}


function timeLabel(
    value: string
): string {

    if (!value) {
        return "-";
    }


    return (
        new Intl.DateTimeFormat(
            "bg-BG",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        )
            .format(
                new Date(value)
            )
    );
}


function dateTimeLabel(
    value:
        string | null
): string {

    if (!value) {
        return "-";
    }


    return (
        new Intl.DateTimeFormat(
            "bg-BG",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        )
            .format(
                new Date(value)
            )
    );
}


/* =========================================================
   FORMAT
   ========================================================= */


function formatKm(
    value: number
): string {

    return (
        new Intl.NumberFormat(
            "bg-BG",
            {
                maximumFractionDigits:
                    0
            }
        )
            .format(
                value
            )
    );
}


function formatTons(
    value: number
): string {

    return (
        new Intl.NumberFormat(
            "bg-BG",
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    3
            }
        )
            .format(
                value
            )
    );
}


function endReasonLabel(
    value: string | null
): string {

    switch (value) {

        case "driver_handoff":
            return (
                "Смяна на шофьор"
            );

        case "truck_change":
            return (
                "Смяна на камион"
            );

        case "trip_completed":
            return (
                "Курсът е приключен"
            );

        default:
            return (
                value ||
                "Приключен сегмент"
            );
    }
}


function tripStatusLabel(
    value: string
): string {

    switch (value) {

        case "active":
            return "Активен";

        case "completed":
            return "Приключен";

        case "planned":
            return "Планиран";

        case "cancelled":
            return "Отказан";

        default:
            return value;
    }
}


/* =========================================================
   DRIVER VIEW MODEL
   ========================================================= */


function buildDriverViews():
DriverArchiveView[] {

    if (!archiveMonth) {
        return [];
    }


    const grouped =
        new Map<
            string,
            {
                name: string;

                segments:
                    AdminDriverArchiveSegment[];
            }
        >();


    for (
        const segment
        of archiveMonth.segments
    ) {

        const existing =
            grouped.get(
                segment.driverId
            );


        if (existing) {

            existing.segments.push(
                segment
            );

            /*
             * Prefer the most recent
             * historical snapshot name.
             */
            existing.name =
                segment.driverName ||
                existing.name;

            continue;
        }


        grouped.set(
            segment.driverId,
            {
                name:
                    segment.driverName,

                segments: [
                    segment
                ]
            }
        );
    }


    return Array
        .from(
            grouped.entries()
        )
        .map(
            (
                [
                    id,
                    data
                ]
            ) => {

                const payableKm =
                    data.segments
                        .reduce(
                            (
                                sum,
                                segment
                            ) =>
                                sum +
                                segment.totalKm,
                            0
                        );


                const tripCount =
                    new Set(
                        data.segments
                            .map(
                                segment =>
                                    segment.tripId
                            )
                    ).size;


                const workDays =
                    new Set(
                        data.segments
                            .map(
                                segment =>
                                    segment.workDate
                            )
                    ).size;


                return {
                    id,

                    name:
                        data.name,

                    payableKm,

                    tripCount,

                    segmentCount:
                        data.segments.length,

                    workDays,

                    segments:
                        [...data.segments]
                            .sort(
                                (
                                    first,
                                    second
                                ) =>
                                    Date.parse(
                                        second.endedAt
                                    ) -
                                    Date.parse(
                                        first.endedAt
                                    )
                            )
                };
            }
        )
        .sort(
            (
                first,
                second
            ) => {

                if (
                    first.payableKm !==
                    second.payableKm
                ) {

                    return (
                        second.payableKm -
                        first.payableKm
                    );
                }


                return (
                    first.name
                        .localeCompare(
                            second.name,
                            "bg"
                        )
                );
            }
        );
}


/* =========================================================
   ROOT HTML
   ========================================================= */


export function renderSection():
string {

    return `
        <section
            id="k3ArchiveSection"
            class="archive-section"
        >

            <div
                id="k3ArchiveMessage"
                class="archive-message"
                aria-live="polite"
            ></div>


            <header
                class="archive-toolbar"
            >

                <div
                    class="archive-toolbar-heading"
                >
                    <span>
                        📊 DRIVER ARCHIVE
                    </span>

                    <strong>
                        Километри за плащане
                    </strong>

                    <small>
                        Всеки приключен сегмент
                        влиза в месеца, в който
                        е приключил.
                    </small>
                </div>


                <div
                    class="archive-month-control"
                >
                    <button
                        type="button"
                        data-archive-action="previous-month"
                        aria-label="Предишен месец"
                        title="Предишен месец"
                    >
                        ‹
                    </button>

                    <strong
                        id="k3ArchiveMonthLabel"
                    >
                        -
                    </strong>

                    <button
                        id="k3ArchiveNextMonth"
                        type="button"
                        data-archive-action="next-month"
                        aria-label="Следващ месец"
                        title="Следващ месец"
                    >
                        ›
                    </button>

                    <button
                        type="button"
                        class="archive-current-month"
                        data-archive-action="current-month"
                    >
                        Текущ месец
                    </button>
                </div>

            </header>


            <section
                id="k3ArchiveSummary"
                class="archive-summary"
            >
                <article
                    class="archive-summary-card"
                >
                    <span>
                        Приключени курсове
                    </span>

                    <strong>
                        —
                    </strong>

                    <small>
                        приключили през месеца
                    </small>
                </article>

                <article
                    class="
                        archive-summary-card
                        archive-summary-payable
                    "
                >
                    <span>
                        Км за плащане
                    </span>

                    <strong>
                        —
                    </strong>

                    <small>
                        всички приключени сегменти
                    </small>
                </article>

                <article
                    class="archive-summary-card"
                >
                    <span>
                        Реално натоварени
                    </span>

                    <strong>
                        —
                    </strong>

                    <small>
                        от приключилите курсове
                    </small>
                </article>

                <article
                    class="archive-summary-card"
                >
                    <span>
                        Несъответствия
                    </span>

                    <strong>
                        —
                    </strong>

                    <small>
                        от приключилите курсове
                    </small>
                </article>
            </section>


            <div
                class="archive-layout"
            >

                <aside
                    class="archive-drivers-panel"
                >
                    <header
                        class="archive-panel-header"
                    >
                        <div>
                            <strong>
                                👨‍✈️ Шофьори
                            </strong>

                            <span>
                                Общо за месеца
                            </span>
                        </div>

                        <span
                            id="k3ArchiveDriverCount"
                            class="archive-count"
                        >
                            0
                        </span>
                    </header>


                    <div
                        id="k3ArchiveDriversList"
                        class="archive-drivers-list"
                    >
                        <div
                            class="archive-loading"
                        >
                            Зареждане...
                        </div>
                    </div>
                </aside>


                <main
                    id="k3ArchiveDriverDetails"
                    class="archive-driver-details"
                >
                    <div
                        class="archive-loading"
                    >
                        Зареждане...
                    </div>
                </main>

            </div>

        </section>
    `;
}


/* =========================================================
   MESSAGE
   ========================================================= */


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
            "#k3ArchiveMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "archive-message";


    if (type) {

        element.classList.add(
            `archive-message-${type}`
        );
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */


function renderSummary():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveSummary"
        );


    if (
        !container ||
        !archiveMonth
    ) {
        return;
    }


    const summary =
        archiveMonth.summary;


    container.innerHTML = `
        <article
            class="archive-summary-card"
        >
            <span>
                Приключени курсове
            </span>

            <strong>
                ${escapeHtml(
                    formatKm(
                        summary.completedTrips
                    )
                )}
            </strong>

            <small>
                приключили през месеца
            </small>
        </article>


        <article
            class="
                archive-summary-card
                archive-summary-payable
            "
        >
            <span>
                Км за плащане
            </span>

            <strong>
                ${escapeHtml(
                    formatKm(
                        summary.payableKm
                    )
                )}
                км
            </strong>

            <small>
                всички приключени сегменти
            </small>
        </article>


        <article
            class="archive-summary-card"
        >
            <span>
                Реално натоварени
            </span>

            <strong>
                ${escapeHtml(
                    formatTons(
                        summary.loadedTons
                    )
                )}
                т.
            </strong>

            <small>
                товарът се брои веднъж на курс
            </small>
        </article>


        <article
            class="archive-summary-card"
        >
            <span>
                Несъответствия
            </span>

            <strong>
                ${
                    summary.discrepancyCount ===
                    null

                        ? "—"

                        : escapeHtml(
                            formatKm(
                                summary
                                    .discrepancyCount
                            )
                        )
                }
            </strong>

            <small>
                ${
                    summary.discrepancyCount ===
                    null

                        ? "няма право за преглед"

                        : "от приключилите курсове"
                }
            </small>
        </article>
    `;
}


/* =========================================================
   DRIVER LIST
   ========================================================= */


function renderDrivers():
void {

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveDriversList"
        );

    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveDriverCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    const drivers =
        buildDriverViews();


    count.textContent =
        String(
            drivers.length
        );


    if (
        drivers.length ===
        0
    ) {

        list.innerHTML = `
            <div
                class="archive-empty"
            >
                Няма записани километри
                за този месец.
            </div>
        `;

        return;
    }


    if (
        !selectedDriverId ||
        !drivers.some(
            driver =>
                driver.id ===
                selectedDriverId
        )
    ) {

        selectedDriverId =
            drivers[0].id;
    }


    list.innerHTML =
        drivers
            .map(
                driver => `
                    <button
                        type="button"
                        class="
                            archive-driver-button
                            ${
                                driver.id ===
                                selectedDriverId

                                    ? "archive-driver-button-active"

                                    : ""
                            }
                        "
                        data-archive-action="select-driver"
                        data-driver-id="${escapeHtml(
                            driver.id
                        )}"
                    >
                        <span
                            class="archive-driver-main"
                        >
                            <strong>
                                ${escapeHtml(
                                    driver.name
                                )}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    formatKm(
                                        driver.tripCount
                                    )
                                )}
                                ${
                                    driver.tripCount ===
                                    1

                                        ? "курс"

                                        : "курса"
                                }
                                ·
                                ${escapeHtml(
                                    formatKm(
                                        driver.workDays
                                    )
                                )}
                                ${
                                    driver.workDays ===
                                    1

                                        ? "ден"

                                        : "дни"
                                }
                            </small>
                        </span>

                        <span
                            class="archive-driver-km"
                        >
                            <strong>
                                ${escapeHtml(
                                    formatKm(
                                        driver.payableKm
                                    )
                                )}
                            </strong>

                            <small>
                                км
                            </small>
                        </span>
                    </button>
                `
            )
            .join("");
}


/* =========================================================
   DRIVER DETAILS
   ========================================================= */


function renderDriverDetails():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveDriverDetails"
        );


    if (!container) {
        return;
    }


    const driver =
        buildDriverViews()
            .find(
                item =>
                    item.id ===
                    selectedDriverId
            );


    if (!driver) {

        container.innerHTML = `
            <div
                class="archive-empty archive-empty-large"
            >
                Избери шофьор,
                за да видиш
                месечния му архив.
            </div>
        `;

        return;
    }


    const dates =
        Array.from(
            new Set(
                driver.segments
                    .map(
                        segment =>
                            segment.workDate
                    )
            )
        )
            .sort(
                (
                    first,
                    second
                ) =>
                    second.localeCompare(
                        first
                    )
            );


    container.innerHTML = `
        <header
            class="archive-driver-header"
        >
            <div>
                <span>
                    👨‍✈️ Шофьор
                </span>

                <strong>
                    ${escapeHtml(
                        driver.name
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        monthLabel(
                            selectedMonthStart
                        )
                    )}
                </small>
            </div>


            <div
                class="archive-driver-total"
            >
                <span>
                    Общо за плащане
                </span>

                <strong>
                    ${escapeHtml(
                        formatKm(
                            driver.payableKm
                        )
                    )}
                    км
                </strong>
            </div>
        </header>


        <section
            class="archive-driver-mini-summary"
        >
            <div>
                <span>
                    Курсове
                </span>

                <strong>
                    ${escapeHtml(
                        formatKm(
                            driver.tripCount
                        )
                    )}
                </strong>
            </div>

            <div>
                <span>
                    Сегменти
                </span>

                <strong>
                    ${escapeHtml(
                        formatKm(
                            driver.segmentCount
                        )
                    )}
                </strong>
            </div>

            <div>
                <span>
                    Работни дни
                </span>

                <strong>
                    ${escapeHtml(
                        formatKm(
                            driver.workDays
                        )
                    )}
                </strong>
            </div>
        </section>


        <div
            class="archive-days"
        >
            ${dates
                .map(
                    date =>
                        renderDriverDay(
                            driver,
                            date
                        )
                )
                .join("")}
        </div>
    `;
}


function renderDriverDay(
    driver: DriverArchiveView,
    date: string
): string {

    const daySegments =
        driver.segments
            .filter(
                segment =>
                    segment.workDate ===
                    date
            )
            .sort(
                (
                    first,
                    second
                ) =>
                    Date.parse(
                        second.endedAt
                    ) -
                    Date.parse(
                        first.endedAt
                    )
            );


    const dayKm =
        daySegments
            .reduce(
                (
                    sum,
                    segment
                ) =>
                    sum +
                    segment.totalKm,
                0
            );


    const tripIds =
        Array.from(
            new Set(
                daySegments
                    .map(
                        segment =>
                            segment.tripId
                    )
            )
        );


    return `
        <section
            class="archive-day"
        >

            <header
                class="archive-day-header"
            >
                <div>
                    <strong>
                        📅
                        ${escapeHtml(
                            dayLabel(
                                date
                            )
                        )}
                    </strong>

                    <span>
                        ${tripIds.length}
                        ${
                            tripIds.length ===
                            1

                                ? "курс"

                                : "курса"
                        }
                    </span>
                </div>

                <strong
                    class="archive-day-km"
                >
                    ${escapeHtml(
                        formatKm(
                            dayKm
                        )
                    )}
                    км
                </strong>
            </header>


            <div
                class="archive-day-trips"
            >
                ${tripIds
                    .map(
                        tripId =>
                            renderDriverTrip(
                                daySegments
                                    .filter(
                                        segment =>
                                            segment.tripId ===
                                            tripId
                                    )
                            )
                    )
                    .join("")}
            </div>

        </section>
    `;
}


function renderDriverTrip(
    segments:
        AdminDriverArchiveSegment[]
): string {

    const orderedSegments =
        [...segments]
            .sort(
                (
                    first,
                    second
                ) =>
                    first.segmentNumber -
                    second.segmentNumber
            );


    const first =
        orderedSegments[0];


    const payableKm =
        orderedSegments
            .reduce(
                (
                    sum,
                    segment
                ) =>
                    sum +
                    segment.totalKm,
                0
            );


    const discrepancy =
        first.tripDiscrepancyCount;


    return `
        <article
            class="archive-trip-card"
        >

            <header
                class="archive-trip-header"
            >
                <div>
                    <strong>
                        Курс
                        #${escapeHtml(
                            String(
                                first.tripNumber
                            )
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            tripStatusLabel(
                                first.tripStatus
                            )
                        )}

                        ${
                            first.tripCompletedAt

                                ? `· ${escapeHtml(
                                    dateTimeLabel(
                                        first.tripCompletedAt
                                    )
                                )}`

                                : ""
                        }
                    </span>
                </div>


                <strong
                    class="archive-trip-km"
                >
                    ${escapeHtml(
                        formatKm(
                            payableKm
                        )
                    )}
                    км
                </strong>
            </header>


            <div
                class="archive-trip-meta"
            >
                <span>
                    ⚖️ Товар на курса
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                first.tripLoadedTons
                            )
                        )}
                        т.
                    </strong>
                </span>

                ${
                    discrepancy ===
                    null

                        ? ""

                        : discrepancy > 0

                            ? `
                                <span
                                    class="archive-trip-warning"
                                >
                                    ⚠️
                                    ${escapeHtml(
                                        String(
                                            discrepancy
                                        )
                                    )}
                                    ${
                                        discrepancy ===
                                        1

                                            ? "несъответствие"

                                            : "несъответствия"
                                    }
                                </span>
                            `

                            : `
                                <span
                                    class="archive-trip-ok"
                                >
                                    ✓ Без несъответствия
                                </span>
                            `
                }
            </div>


            <div
                class="archive-segments"
            >
                ${orderedSegments
                    .map(
                        segment =>
                            renderSegment(
                                segment
                            )
                    )
                    .join("")}
            </div>

        </article>
    `;
}


function renderSegment(
    segment:
        AdminDriverArchiveSegment
): string {

    return `
        <div
            class="archive-segment-row"
        >

            <div
                class="archive-segment-number"
            >
                ${escapeHtml(
                    String(
                        segment.segmentNumber
                    )
                )}
            </div>


            <div
                class="archive-segment-main"
            >
                <strong>
                    🚛
                    ${escapeHtml(
                        segment.truckNumber
                    )}

                    ${
                        segment.trailerNumber

                            ? ` · 🛻 ${escapeHtml(
                                segment.trailerNumber
                            )}`

                            : ""
                    }
                </strong>

                <span>
                    ${escapeHtml(
                        timeLabel(
                            segment.startedAt
                        )
                    )}
                    →
                    ${escapeHtml(
                        timeLabel(
                            segment.endedAt
                        )
                    )}
                    ·
                    ${escapeHtml(
                        endReasonLabel(
                            segment.endReason
                        )
                    )}
                </span>

                <small>
                    Километраж:
                    ${escapeHtml(
                        formatKm(
                            segment.startKm
                        )
                    )}
                    →
                    ${escapeHtml(
                        formatKm(
                            segment.endKm
                        )
                    )}
                </small>
            </div>


            <strong
                class="archive-segment-km"
            >
                ${escapeHtml(
                    formatKm(
                        segment.totalKm
                    )
                )}
                км
            </strong>

        </div>
    `;
}


/* =========================================================
   HEADER STATE
   ========================================================= */


function renderMonthHeader():
void {

    const label =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveMonthLabel"
        );

    const nextButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#k3ArchiveNextMonth"
        );


    if (label) {

        label.textContent =
            monthLabel(
                selectedMonthStart
            );
    }


    if (nextButton) {

        nextButton.disabled =
            selectedMonthStart >=
            businessMonthStart();
    }
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refreshArchive():
Promise<void> {

    const currentVersion =
        ++refreshVersion;


    setMessage(
        "",
        null
    );


    renderMonthHeader();


    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveDriversList"
        );

    const details =
        document.querySelector<
            HTMLElement
        >(
            "#k3ArchiveDriverDetails"
        );


    if (list) {

        list.innerHTML = `
            <div
                class="archive-loading"
            >
                Зареждане на архива...
            </div>
        `;
    }


    if (details) {

        details.innerHTML = `
            <div
                class="archive-loading"
            >
                Зареждане...
            </div>
        `;
    }


    try {

        const result =
            await loadAdminDriverArchiveMonth(
                selectedMonthStart
            );


        if (
            currentVersion !==
            refreshVersion
        ) {
            return;
        }


        const root =
            getRoot();


        if (
            !root?.isConnected
        ) {
            return;
        }


        archiveMonth =
            result;


        const drivers =
            buildDriverViews();


        if (
            !selectedDriverId ||
            !drivers.some(
                driver =>
                    driver.id ===
                    selectedDriverId
            )
        ) {

            selectedDriverId =
                drivers[0]?.id ||
                null;
        }


        renderSummary();

        renderDrivers();

        renderDriverDetails();

        renderMonthHeader();

    } catch (error) {

        if (
            currentVersion !==
            refreshVersion
        ) {
            return;
        }


        const message =
            error instanceof Error &&
            error.message

                ? error.message

                : "Архивът не можа да бъде зареден.";


        setMessage(
            message,
            "error"
        );


        if (list) {

            list.innerHTML = `
                <div
                    class="archive-empty"
                >
                    Няма заредени данни.
                </div>
            `;
        }


        if (details) {

            details.innerHTML = `
                <div
                    class="archive-empty archive-empty-large"
                >
                    ${escapeHtml(
                        message
                    )}
                </div>
            `;
        }
    }
}


/* =========================================================
   EVENTS
   ========================================================= */


function handleClick(
    event: MouseEvent
): void {

    const target =
        event.target;


    if (
        !(target instanceof
            Element)
    ) {
        return;
    }


    const button =
        target.closest<
            HTMLButtonElement
        >(
            "[data-archive-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset
            .archiveAction;


    if (
        action ===
        "previous-month"
    ) {

        selectedMonthStart =
            shiftMonth(
                selectedMonthStart,
                -1
            );

        selectedDriverId =
            null;

        void refreshArchive();

        return;
    }


    if (
        action ===
        "next-month"
    ) {

        const next =
            shiftMonth(
                selectedMonthStart,
                1
            );


        if (
            next >
            businessMonthStart()
        ) {
            return;
        }


        selectedMonthStart =
            next;

        selectedDriverId =
            null;

        void refreshArchive();

        return;
    }


    if (
        action ===
        "current-month"
    ) {

        selectedMonthStart =
            businessMonthStart();

        selectedDriverId =
            null;

        void refreshArchive();

        return;
    }


    if (
        action ===
        "select-driver"
    ) {

        selectedDriverId =
            button.dataset
                .driverId ||
            null;


        renderDrivers();

        renderDriverDetails();
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function
initializeSection():
Promise<void> {

    const root =
        getRoot();


    if (!root) {
        return;
    }


    root.addEventListener(
        "click",
        handleClick
    );


    await refreshArchive();
}
