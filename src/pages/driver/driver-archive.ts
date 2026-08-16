import "./driver-archive.css";


import {
    loadDriverArchiveMonth,
    type DriverArchiveMonth,
    type DriverArchiveSegment
} from "../../features/trips/driver-archive-service";


import {
    escapeHtml
} from "../../shared/lib/html";


const BUSINESS_TIMEZONE =
    "Europe/Sofia";


const WEEKDAYS = [
    "Пон",
    "Вто",
    "Сря",
    "Чет",
    "Пет",
    "Съб",
    "Нед"
];


let selectedMonth =
    currentBusinessMonth();


let archive:
    DriverArchiveMonth | null =
    null;


let refreshVersion =
    0;


/* =========================================================
   DATE HELPERS
   ========================================================= */


function currentBusinessMonth():
string {

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
                new Date()
            );


    const year =
        parts.find(
            item =>
                item.type ===
                    "year"
        )?.value ||
        "1970";


    const month =
        parts.find(
            item =>
                item.type ===
                    "month"
        )?.value ||
        "01";


    return (
        `${year}-${month}-01`
    );
}


function shiftMonth(
    value: string,
    offset: number
): string {

    const [
        year,
        month
    ] =
        value
            .split("-")
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1 +
                    offset,
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
    value: string
): string {

    const date =
        new Date(
            `${value}T12:00:00Z`
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

    return new Intl
        .DateTimeFormat(
            "bg-BG",
            {
                timeZone:
                    BUSINESS_TIMEZONE,

                weekday:
                    "long",

                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric"
            }
        )
        .format(
            new Date(
                `${value}T12:00:00Z`
            )
        );
}


function timeLabel(
    value: string
): string {

    if (!value) {
        return "-";
    }


    return new Intl
        .DateTimeFormat(
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
        );
}


function daysInMonth(
    value: string
): number {

    const [
        year,
        month
    ] =
        value
            .split("-")
            .map(Number);


    return new Date(
        Date.UTC(
            year,
            month,
            0,
            12
        )
    ).getUTCDate();
}


function firstWeekdayIndex(
    value: string
): number {

    const day =
        new Date(
            `${value}T12:00:00Z`
        ).getUTCDay();


    return day === 0
        ? 6
        : day - 1;
}


function dateForDay(
    day: number
): string {

    return (
        `${selectedMonth.slice(
            0,
            8
        )}${String(day)
            .padStart(
                2,
                "0"
            )}`
    );
}


/* =========================================================
   FORMAT
   ========================================================= */


function formatNumber(
    value: number
): string {

    return new Intl
        .NumberFormat(
            "bg-BG",
            {
                maximumFractionDigits:
                    0
            }
        )
        .format(
            value
        );
}


function endReasonLabel(
    value: string | null
): string {

    switch (value) {

        case "driver_handoff":
            return (
                "Предаден курс"
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
                "Приключена отсечка"
            );
    }
}


function tripStatusLabel(
    value: string
): string {

    switch (value) {

        case "active":
            return (
                "Курсът продължава"
            );

        case "completed":
            return (
                "Приключен курс"
            );

        case "cancelled":
            return (
                "Отказан курс"
            );

        case "planned":
            return (
                "Планиран курс"
            );

        default:
            return value;
    }
}


/* =========================================================
   DOM
   ========================================================= */


function root():
HTMLElement | null {

    return document
        .querySelector<HTMLElement>(
            "#k3DriverPortal"
        );
}


function archiveView():
HTMLElement | null {

    return document
        .querySelector<HTMLElement>(
            "#k3DriverArchiveView"
        );
}


function archiveDialog():
HTMLDialogElement | null {

    return document
        .querySelector<
            HTMLDialogElement
        >(
            "#k3DriverArchiveDayDialog"
        );
}


/* =========================================================
   SHELL
   ========================================================= */


function renderShell():
void {

    const container =
        archiveView();


    if (!container) {
        return;
    }


    container.innerHTML = `
        <section
            class="driver-archive-card"
        >

            <header
                class="driver-archive-header"
            >
                <div>
                    <span>
                        📅 МОЯТ АРХИВ
                    </span>

                    <strong>
                        Моите километри
                    </strong>

                    <small>
                        Всеки приключен сегмент
                        се записва само на шофьора,
                        който го е карал.
                    </small>
                </div>


                <div
                    class="driver-archive-month-control"
                >
                    <button
                        type="button"
                        data-driver-archive-action="previous-month"
                        aria-label="Предишен месец"
                    >
                        ←
                    </button>

                    <strong
                        id="k3DriverArchiveMonth"
                    >
                        -
                    </strong>

                    <button
                        id="k3DriverArchiveNextMonth"
                        type="button"
                        data-driver-archive-action="next-month"
                        aria-label="Следващ месец"
                    >
                        →
                    </button>
                </div>
            </header>


            <section
                class="driver-archive-total"
            >
                <span>
                    Общо за месеца
                </span>

                <strong
                    id="k3DriverArchiveTotalKm"
                >
                    —
                </strong>

                <small
                    id="k3DriverArchiveMeta"
                >
                    —
                </small>
            </section>


            <div
                id="k3DriverArchiveMessage"
                class="driver-archive-message"
                aria-live="polite"
            ></div>


            <div
                class="driver-archive-calendar-scroll"
            >
                <div
                    class="driver-archive-calendar"
                >
                    <div
                        class="driver-archive-weekdays"
                    >
                        ${WEEKDAYS
                            .map(
                                day => `
                                    <div>
                                        ${escapeHtml(
                                            day
                                        )}
                                    </div>
                                `
                            )
                            .join("")}
                    </div>


                    <div
                        id="k3DriverArchiveCalendar"
                        class="driver-archive-grid"
                    ></div>
                </div>
            </div>

        </section>


        <dialog
            id="k3DriverArchiveDayDialog"
            class="driver-archive-dialog"
        >
            <div
                class="driver-archive-dialog-shell"
            >
                <header
                    class="driver-archive-dialog-topbar"
                >
                    <strong>
                        Детайли за деня
                    </strong>

                    <button
                        type="button"
                        data-driver-archive-action="close-day"
                        aria-label="Затвори"
                    >
                        ✕
                    </button>
                </header>

                <div
                    id="k3DriverArchiveDialogContent"
                    class="driver-archive-dialog-content"
                ></div>
            </div>
        </dialog>
    `;


    renderMonthHeader();
}


/* =========================================================
   VIEW SWITCHING
   ========================================================= */


function setView(
    view:
        | "route"
        | "archive"
): void {

    const portal =
        root();

    const archiveContainer =
        archiveView();


    if (
        !portal ||
        !archiveContainer
    ) {
        return;
    }


    const showArchive =
        view ===
            "archive";


    portal
        .querySelectorAll<
            HTMLElement
        >(
            "[data-driver-route-content]"
        )
        .forEach(
            element => {
                element.hidden =
                    showArchive;
            }
        );


    archiveContainer.hidden =
        !showArchive;


    const routeButton =
        portal.querySelector<
            HTMLButtonElement
        >(
            '[data-driver-archive-action="show-route"]'
        );

    const archiveButton =
        portal.querySelector<
            HTMLButtonElement
        >(
            '[data-driver-archive-action="show-archive"]'
        );


    routeButton?.classList.toggle(
        "driver-view-button-active",
        !showArchive
    );

    archiveButton?.classList.toggle(
        "driver-view-button-active",
        showArchive
    );


    routeButton?.setAttribute(
        "aria-pressed",
        String(
            !showArchive
        )
    );

    archiveButton?.setAttribute(
        "aria-pressed",
        String(
            showArchive
        )
    );


    if (showArchive) {

        void refreshArchive();

        return;
    }


    if (
        archiveDialog()?.open
    ) {
        archiveDialog()?.close();
    }


    window.setTimeout(
        () => {
            window.dispatchEvent(
                new Event(
                    "resize"
                )
            );
        },
        50
    );
}


/* =========================================================
   MONTH
   ========================================================= */


function renderMonthHeader():
void {

    const label =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveMonth"
            );

    const next =
        document
            .querySelector<
                HTMLButtonElement
            >(
                "#k3DriverArchiveNextMonth"
            );


    if (label) {

        label.textContent =
            monthLabel(
                selectedMonth
            );
    }


    if (next) {

        next.disabled =
            selectedMonth >=
            currentBusinessMonth();
    }
}


/* =========================================================
   CALENDAR
   ========================================================= */


function segmentsForDate(
    date: string
): DriverArchiveSegment[] {

    return (
        archive?.segments
            .filter(
                segment =>
                    segment.workDate ===
                    date
            ) ||
        []
    );
}


function renderCalendar():
void {

    const calendar =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveCalendar"
            );


    const total =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveTotalKm"
            );


    const meta =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveMeta"
            );


    if (
        !calendar ||
        !total ||
        !meta ||
        !archive
    ) {
        return;
    }


    total.textContent =
        `${formatNumber(
            archive.summary
                .payableKm
        )} км`;


    meta.textContent =
        `${formatNumber(
            archive.summary
                .tripCount
        )} курса · ${formatNumber(
            archive.summary
                .workDays
        )} работни дни`;


    const blankCount =
        firstWeekdayIndex(
            selectedMonth
        );


    const blankCells =
        Array
            .from({
                length:
                    blankCount
            })
            .map(
                () => `
                    <div
                        class="driver-archive-cell-blank"
                    ></div>
                `
            )
            .join("");


    const days =
        Array
            .from({
                length:
                    daysInMonth(
                        selectedMonth
                    )
            })
            .map(
                (
                    _,
                    index
                ) => {

                    const day =
                        index + 1;

                    const date =
                        dateForDay(
                            day
                        );

                    const segments =
                        segmentsForDate(
                            date
                        );

                    const km =
                        segments
                            .reduce(
                                (
                                    sum,
                                    segment
                                ) =>
                                    sum +
                                    segment
                                        .totalKm,
                                0
                            );

                    const trips =
                        new Set(
                            segments
                                .map(
                                    segment =>
                                        segment
                                            .tripId
                                )
                        ).size;

                    const hasData =
                        segments.length >
                            0;


                    return `
                        <button
                            type="button"
                            class="
                                driver-archive-cell
                                ${
                                    hasData
                                        ? "driver-archive-cell-active"
                                        : "driver-archive-cell-empty"
                                }
                            "
                            ${
                                hasData

                                    ? `data-driver-archive-action="open-day"`

                                    : "disabled"
                            }
                            data-date="${escapeHtml(
                                date
                            )}"
                        >
                            <span
                                class="driver-archive-day-number"
                            >
                                ${day}
                            </span>

                            ${
                                hasData

                                    ? `
                                        <strong>
                                            ${escapeHtml(
                                                formatNumber(
                                                    km
                                                )
                                            )}
                                            км
                                        </strong>

                                        <small>
                                            ${trips}
                                            ${
                                                trips ===
                                                1

                                                    ? "курс"

                                                    : "курса"
                                            }
                                        </small>
                                    `

                                    : `
                                        <span
                                            class="driver-archive-no-data"
                                        >
                                            —
                                        </span>
                                    `
                            }
                        </button>
                    `;
                }
            )
            .join("");


    calendar.innerHTML =
        blankCells +
        days;
}


/* =========================================================
   DAY DIALOG
   ========================================================= */


function renderSegment(
    segment:
        DriverArchiveSegment
): string {

    return `
        <div
            class="driver-archive-segment"
        >
            <div>
                <strong>
                    🚛
                    ${escapeHtml(
                        segment
                            .truckNumber
                    )}

                    ${
                        segment
                            .trailerNumber

                            ? ` · 🛻 ${escapeHtml(
                                segment
                                    .trailerNumber
                            )}`

                            : ""
                    }
                </strong>

                <span>
                    ${escapeHtml(
                        timeLabel(
                            segment
                                .startedAt
                        )
                    )}
                    →
                    ${escapeHtml(
                        timeLabel(
                            segment
                                .endedAt
                        )
                    )}
                    ·
                    ${escapeHtml(
                        endReasonLabel(
                            segment
                                .endReason
                        )
                    )}
                </span>

                <small>
                    ${escapeHtml(
                        formatNumber(
                            segment
                                .startKm
                        )
                    )}
                    →
                    ${escapeHtml(
                        formatNumber(
                            segment
                                .endKm
                        )
                    )}
                    км
                </small>
            </div>

            <strong
                class="driver-archive-segment-km"
            >
                ${escapeHtml(
                    formatNumber(
                        segment
                            .totalKm
                    )
                )}
                км
            </strong>
        </div>
    `;
}


function openDay(
    date: string
): void {

    const dialog =
        archiveDialog();

    const content =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveDialogContent"
            );


    if (
        !dialog ||
        !content
    ) {
        return;
    }


    const segments =
        segmentsForDate(
            date
        );


    if (
        segments.length ===
        0
    ) {
        return;
    }


    const grouped =
        new Map<
            string,
            DriverArchiveSegment[]
        >();


    for (
        const segment
        of segments
    ) {

        const list =
            grouped.get(
                segment.tripId
            ) ||
            [];


        list.push(
            segment
        );


        grouped.set(
            segment.tripId,
            list
        );
    }


    const trips =
        Array
            .from(
                grouped.values()
            )
            .sort(
                (
                    first,
                    second
                ) =>
                    Date.parse(
                        second[0]
                            .endedAt
                    ) -
                    Date.parse(
                        first[0]
                            .endedAt
                    )
            );


    const dayKm =
        segments
            .reduce(
                (
                    sum,
                    segment
                ) =>
                    sum +
                    segment.totalKm,
                0
            );


    content.innerHTML = `
        <header
            class="driver-archive-day-header"
        >
            <div>
                <strong>
                    ${escapeHtml(
                        dayLabel(
                            date
                        )
                    )}
                </strong>

                <small>
                    Твоите километри
                    за деня
                </small>
            </div>

            <strong>
                ${escapeHtml(
                    formatNumber(
                        dayKm
                    )
                )}
                км
            </strong>
        </header>


        <div
            class="driver-archive-trips"
        >
            ${trips
                .map(
                    tripSegments => {

                        const ordered =
                            [...tripSegments]
                                .sort(
                                    (
                                        first,
                                        second
                                    ) =>
                                        first
                                            .segmentNumber -
                                        second
                                            .segmentNumber
                                );


                        const first =
                            ordered[0];


                        const tripKm =
                            ordered
                                .reduce(
                                    (
                                        sum,
                                        segment
                                    ) =>
                                        sum +
                                        segment
                                            .totalKm,
                                    0
                                );


                        return `
                            <article
                                class="driver-archive-trip"
                            >
                                <header>
                                    <div>
                                        <strong>
                                            Курс
                                            #${escapeHtml(
                                                String(
                                                    first
                                                        .tripNumber
                                                )
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                tripStatusLabel(
                                                    first
                                                        .tripStatus
                                                )
                                            )}
                                        </span>
                                    </div>

                                    <strong>
                                        ${escapeHtml(
                                            formatNumber(
                                                tripKm
                                            )
                                        )}
                                        км
                                    </strong>
                                </header>


                                <div
                                    class="driver-archive-trip-segments"
                                >
                                    ${ordered
                                        .map(
                                            renderSegment
                                        )
                                        .join("")}
                                </div>
                            </article>
                        `;
                    }
                )
                .join("")}
        </div>
    `;


    if (!dialog.open) {
        dialog.showModal();
    }
}


/* =========================================================
   REFRESH
   ========================================================= */


function setArchiveMessage(
    message: string
): void {

    const element =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveMessage"
            );


    if (!element) {
        return;
    }


    element.textContent =
        message;
}


async function refreshArchive():
Promise<void> {

    const version =
        ++refreshVersion;


    renderMonthHeader();

    setArchiveMessage(
        ""
    );


    const calendar =
        document
            .querySelector<
                HTMLElement
            >(
                "#k3DriverArchiveCalendar"
            );


    if (calendar) {

        calendar.innerHTML = `
            <div
                class="driver-archive-loading"
            >
                Зареждане...
            </div>
        `;
    }


    try {

        const result =
            await loadDriverArchiveMonth(
                selectedMonth
            );


        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        if (
            !archiveView()
                ?.isConnected
        ) {
            return;
        }


        archive =
            result;


        renderCalendar();


    } catch (error) {

        setArchiveMessage(
            error instanceof Error
                ? error.message
                : "Архивът не можа да бъде зареден."
        );
    }
}


/* =========================================================
   EVENTS
   ========================================================= */


async function handleArchiveClick(
    event: Event
): Promise<void> {

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
            "[data-driver-archive-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset
            .driverArchiveAction;


    if (
        action ===
        "show-route"
    ) {

        setView(
            "route"
        );

        return;
    }


    if (
        action ===
        "show-archive"
    ) {

        setView(
            "archive"
        );

        return;
    }


    if (
        action ===
        "previous-month"
    ) {

        selectedMonth =
            shiftMonth(
                selectedMonth,
                -1
            );

        await refreshArchive();

        return;
    }


    if (
        action ===
        "next-month"
    ) {

        const next =
            shiftMonth(
                selectedMonth,
                1
            );


        if (
            next >
            currentBusinessMonth()
        ) {
            return;
        }


        selectedMonth =
            next;


        await refreshArchive();

        return;
    }


    if (
        action ===
        "open-day"
    ) {

        const date =
            button.dataset
                .date;


        if (date) {

            openDay(
                date
            );
        }

        return;
    }


    if (
        action ===
        "close-day"
    ) {

        if (
            archiveDialog()
                ?.open
        ) {
            archiveDialog()
                ?.close();
        }
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export function
initializeDriverArchive():
void {

    const portal =
        root();


    if (!portal) {
        return;
    }


    if (
        portal.dataset
            .driverArchiveInitialized ===
            "true"
    ) {
        return;
    }


    portal.dataset
        .driverArchiveInitialized =
        "true";


    renderShell();


    portal.addEventListener(
        "click",
        event => {
            void handleArchiveClick(
                event
            );
        }
    );


    setView(
        "route"
    );
}
