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

const WEEKDAY_LABELS = [
    "Пн",
    "Вт",
    "Ср",
    "Чт",
    "Пт",
    "Сб",
    "Нд"
];


let archiveMonth:
    AdminDriverArchiveMonth | null =
    null;

let selectedDriverId:
    string | null =
    null;

let selectedMonthStart =
    businessMonthStart();

let selectedDate:
    string | null =
    null;

let refreshVersion =
    0;


type DriverArchiveView = {
    id: string;
    name: string;
    payableKm: number;
    tripCount: number;
    segments:
        AdminDriverArchiveSegment[];
};


type CalendarCell = {
    date: string;
    dayNumber: number;
    payableKm: number;
    tripCount: number;
    segments:
        AdminDriverArchiveSegment[];
};


function getRoot():
HTMLElement | null {

    return document
        .querySelector<HTMLElement>(
            "#k3ArchiveSection"
        );
}


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
        )?.value || "1970";

    const month =
        parts.find(
            part =>
                part.type ===
                "month"
        )?.value || "01";

    return `${year}-${month}-01`;
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
            .format(date);

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
        .format(date);
}


function dateTimeLabel(
    value:
        string | null
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
        );
}


function timeLabel(
    value: string
): string {

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
    monthStart: string
): number {

    const [
        year,
        month
    ] =
        monthStart
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


function dayOfWeekIndex(
    value: string
): number {

    const weekday =
        new Date(
            `${value}T12:00:00Z`
        ).getUTCDay();

    return weekday === 0
        ? 6
        : weekday - 1;
}


function padDay(
    value: number
): string {

    return value
        .toString()
        .padStart(2, "0");
}


function dateForDay(
    monthStart: string,
    day: number
): string {

    return (
        `${monthStart.slice(0, 8)}${padDay(day)}`
    );
}


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
        .format(value);
}


function formatKm(
    value: number
): string {

    return (
        `${formatNumber(value)} км`
    );
}


function formatTons(
    value: number
): string {

    return new Intl
        .NumberFormat(
            "bg-BG",
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    3
            }
        )
        .format(value);
}


function endReasonLabel(
    value: string | null
): string {

    switch (value) {
        case "driver_handoff":
            return "Смяна на шофьор";

        case "truck_change":
            return "Смяна на камион";

        case "trip_completed":
            return "Курсът е приключен";

        default:
            return value ||
                "Приключен сегмент";
    }
}


function setMessage(
    message: string,
    type:
        | "error"
        | null
): void {

    const element =
        document.querySelector<HTMLElement>(
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

            if (
                segment.driverName
            ) {
                existing.name =
                    segment.driverName;
            }

            continue;
        }

        grouped.set(
            segment.driverId,
            {
                name:
                    segment.driverName ||
                    "Шофьор",

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
            ([
                id,
                data
            ]) => {

                const payableKm =
                    data.segments.reduce(
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
                        data.segments.map(
                            segment =>
                                segment.tripId
                        )
                    ).size;

                return {
                    id,
                    name:
                        data.name,
                    payableKm,
                    tripCount,
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

                return first.name
                    .localeCompare(
                        second.name,
                        "bg"
                    );
            }
        );
}


function getSelectedDriver():
DriverArchiveView | null {

    const drivers =
        buildDriverViews();

    if (
        drivers.length === 0
    ) {
        return null;
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

    return (
        drivers.find(
            driver =>
                driver.id ===
                selectedDriverId
        ) || null
    );
}


function buildCalendarCells(
    driver:
        DriverArchiveView | null
): CalendarCell[] {

    const grouped =
        new Map<
            string,
            AdminDriverArchiveSegment[]
        >();

    if (driver) {
        for (
            const segment
            of driver.segments
        ) {
            const list =
                grouped.get(
                    segment.workDate
                ) || [];

            list.push(segment);

            grouped.set(
                segment.workDate,
                list
            );
        }
    }

    const result:
        CalendarCell[] = [];

    const totalDays =
        daysInMonth(
            selectedMonthStart
        );

    for (
        let day = 1;
        day <= totalDays;
        day += 1
    ) {
        const date =
            dateForDay(
                selectedMonthStart,
                day
            );

        const segments =
            (
                grouped.get(date) ||
                []
            ).sort(
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

        const tripCount =
            new Set(
                segments.map(
                    segment =>
                        segment.tripId
                )
            ).size;

        const payableKm =
            segments.reduce(
                (
                    sum,
                    segment
                ) =>
                    sum +
                    segment.totalKm,
                0
            );

        result.push({
            date,
            dayNumber: day,
            payableKm,
            tripCount,
            segments
        });
    }

    return result;
}


function ensureSelectedDate():
void {

    const driver =
        getSelectedDriver();

    const cells =
        buildCalendarCells(
            driver
        );

    const valid =
        selectedDate !== null &&
        cells.some(
            cell =>
                cell.date ===
                selectedDate
        );

    if (valid) {
        return;
    }

    const firstWithData =
        cells.find(
            cell =>
                cell.segments.length > 0
        );

    selectedDate =
        firstWithData?.date ||
        cells[0]?.date ||
        null;
}


function renderSection():
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
                        📅 ARCHIVE
                    </span>

                    <strong>
                        Архив по шофьор
                    </strong>

                    <small>
                        Календарен изглед.
                        Натисни ден, за да видиш
                        курсовете за него.
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

            <div
                class="archive-layout"
            >
                <aside
                    class="archive-sidebar"
                >
                    <header
                        class="archive-panel-header"
                    >
                        <strong>
                            👨‍✈️ Шофьори
                        </strong>
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
                    id="k3ArchiveMain"
                    class="archive-main"
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


function renderDrivers():
void {

    const list =
        document.querySelector<HTMLElement>(
            "#k3ArchiveDriversList"
        );

    if (!list) {
        return;
    }

    const drivers =
        buildDriverViews();

    if (
        drivers.length === 0
    ) {
        list.innerHTML = `
            <div class="archive-empty">
                Няма данни за този месец.
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
                        class="archive-driver-button ${
                            driver.id ===
                            selectedDriverId
                                ? "archive-driver-button-active"
                                : ""
                        }"
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
                                    formatNumber(
                                        driver.tripCount
                                    )
                                )} курса
                            </small>
                        </span>

                        <strong
                            class="archive-driver-km"
                        >
                            ${escapeHtml(
                                formatNumber(
                                    driver.payableKm
                                )
                            )}
                        </strong>
                    </button>
                `
            )
            .join("");
}


function renderMain():
void {

    const container =
        document.querySelector<HTMLElement>(
            "#k3ArchiveMain"
        );

    if (!container) {
        return;
    }

    const driver =
        getSelectedDriver();

    if (!driver) {
        container.innerHTML = `
            <div class="archive-empty archive-empty-large">
                Няма записани километри за този месец.
            </div>
        `;
        return;
    }

    ensureSelectedDate();

    const cells =
        buildCalendarCells(
            driver
        );

    const activeCell =
        cells.find(
            cell =>
                cell.date ===
                selectedDate
        ) || null;

    const firstWeekday =
        dayOfWeekIndex(
            selectedMonthStart
        );

    const blankCells =
        Array
            .from({
                length:
                    firstWeekday
            })
            .map(
                () =>
                    `<div class="archive-calendar-blank"></div>`
            )
            .join("");

    container.innerHTML = `
        <section
            class="archive-selected-driver"
        >
            <div>
                <span>
                    Шофьор
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
                class="archive-selected-total"
            >
                <span>
                    Общо км
                </span>

                <strong>
                    ${escapeHtml(
                        formatKm(
                            driver.payableKm
                        )
                    )}
                </strong>
            </div>
        </section>

        <section
            class="archive-calendar-panel"
        >
            <div
                class="archive-weekdays"
            >
                ${WEEKDAY_LABELS
                    .map(
                        label => `
                            <div class="archive-weekday">
                                ${escapeHtml(
                                    label
                                )}
                            </div>
                        `
                    )
                    .join("")}
            </div>

            <div
                class="archive-calendar-grid"
            >
                ${blankCells}
                ${cells
                    .map(
                        cell =>
                            renderCalendarCell(
                                cell
                            )
                    )
                    .join("")}
            </div>
        </section>

        <section
            class="archive-day-panel"
        >
            ${renderSelectedDay(
                activeCell
            )}
        </section>
    `;
}


function renderCalendarCell(
    cell: CalendarCell
): string {

    const isSelected =
        cell.date ===
        selectedDate;

    const hasData =
        cell.segments.length > 0;

    return `
        <button
            type="button"
            class="archive-calendar-cell ${
                hasData
                    ? "archive-calendar-cell-has-data"
                    : "archive-calendar-cell-empty"
            } ${
                isSelected
                    ? "archive-calendar-cell-selected"
                    : ""
            }"
            data-archive-action="select-date"
            data-date="${escapeHtml(
                cell.date
            )}"
        >
            <span
                class="archive-calendar-day"
            >
                ${escapeHtml(
                    String(
                        cell.dayNumber
                    )
                )}
            </span>

            ${
                hasData
                    ? `
                        <strong class="archive-calendar-km">
                            ${escapeHtml(
                                formatNumber(
                                    cell.payableKm
                                )
                            )} км
                        </strong>

                        <small class="archive-calendar-trips">
                            ${escapeHtml(
                                formatNumber(
                                    cell.tripCount
                                )
                            )} курса
                        </small>
                    `
                    : `
                        <strong class="archive-calendar-km archive-calendar-km-empty">
                            —
                        </strong>
                    `
            }
        </button>
    `;
}


function renderSelectedDay(
    cell: CalendarCell | null
): string {

    if (!cell) {
        return `
            <div class="archive-empty archive-empty-large">
                Избери ден от календара.
            </div>
        `;
    }

    if (
        cell.segments.length === 0
    ) {
        return `
            <header class="archive-day-header">
                <div>
                    <strong>
                        ${escapeHtml(
                            dayLabel(
                                cell.date
                            )
                        )}
                    </strong>

                    <small>
                        Няма записани курсове.
                    </small>
                </div>
            </header>

            <div class="archive-empty">
                Няма дейност за този ден.
            </div>
        `;
    }

    const grouped =
        new Map<
            string,
            AdminDriverArchiveSegment[]
        >();

    for (
        const segment
        of cell.segments
    ) {
        const list =
            grouped.get(
                segment.tripId
            ) || [];

        list.push(segment);

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
                        second[0].endedAt
                    ) -
                    Date.parse(
                        first[0].endedAt
                    )
            );

    return `
        <header class="archive-day-header">
            <div>
                <strong>
                    ${escapeHtml(
                        dayLabel(
                            cell.date
                        )
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        formatNumber(
                            trips.length
                        )
                    )} курса
                </small>
            </div>

            <strong
                class="archive-day-total"
            >
                ${escapeHtml(
                    formatKm(
                        cell.payableKm
                    )
                )}
            </strong>
        </header>

        <div
            class="archive-day-content"
        >
            ${trips
                .map(
                    segments =>
                        renderTripCard(
                            segments
                        )
                )
                .join("")}
        </div>
    `;
}


function renderTripCard(
    segments:
        AdminDriverArchiveSegment[]
): string {

    const ordered =
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
        ordered[0];

    const totalKm =
        ordered.reduce(
            (
                sum,
                segment
            ) =>
                sum +
                segment.totalKm,
            0
        );

    return `
        <article
            class="archive-trip-card"
        >
            <header
                class="archive-trip-header"
            >
                <div>
                    <strong>
                        Курс #${escapeHtml(
                            String(
                                first.tripNumber
                            )
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            dateTimeLabel(
                                first.tripCompletedAt
                            )
                        )}
                    </small>
                </div>

                <strong
                    class="archive-trip-total"
                >
                    ${escapeHtml(
                        formatKm(
                            totalKm
                        )
                    )}
                </strong>
            </header>

            <div
                class="archive-trip-meta"
            >
                <span>
                    Товар:
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                first.tripLoadedTons
                            )
                        )} т.
                    </strong>
                </span>

                ${
                    first.tripDiscrepancyCount &&
                    first.tripDiscrepancyCount > 0
                        ? `
                            <span class="archive-trip-warning">
                                ⚠️ ${escapeHtml(
                                    formatNumber(
                                        first.tripDiscrepancyCount
                                    )
                                )} несъответствия
                            </span>
                        `
                        : ""
                }
            </div>

            <div
                class="archive-trip-segments"
            >
                ${ordered
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
                class="archive-segment-main"
            >
                <strong>
                    🚛 ${escapeHtml(
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

                <small>
                    ${escapeHtml(
                        timeLabel(
                            segment.startedAt
                        )
                    )} → ${escapeHtml(
                        timeLabel(
                            segment.endedAt
                        )
                    )} · ${escapeHtml(
                        endReasonLabel(
                            segment.endReason
                        )
                    )}
                </small>

                <small>
                    ${escapeHtml(
                        formatNumber(
                            segment.startKm
                        )
                    )} → ${escapeHtml(
                        formatNumber(
                            segment.endKm
                        )
                    )} км
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
            </strong>
        </div>
    `;
}


function renderMonthHeader():
void {

    const label =
        document.querySelector<HTMLElement>(
            "#k3ArchiveMonthLabel"
        );

    const nextButton =
        document.querySelector<HTMLButtonElement>(
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


async function refreshArchive():
Promise<void> {

    const currentVersion =
        ++refreshVersion;

    setMessage("", null);

    renderMonthHeader();

    const driversList =
        document.querySelector<HTMLElement>(
            "#k3ArchiveDriversList"
        );

    const main =
        document.querySelector<HTMLElement>(
            "#k3ArchiveMain"
        );

    if (driversList) {
        driversList.innerHTML = `
            <div class="archive-loading">
                Зареждане...
            </div>
        `;
    }

    if (main) {
        main.innerHTML = `
            <div class="archive-loading">
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

        ensureSelectedDate();
        renderMonthHeader();
        renderDrivers();
        renderMain();

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

        if (driversList) {
            driversList.innerHTML = `
                <div class="archive-empty">
                    Няма данни.
                </div>
            `;
        }

        if (main) {
            main.innerHTML = `
                <div class="archive-empty archive-empty-large">
                    ${escapeHtml(
                        message
                    )}
                </div>
            `;
        }
    }
}


function handleClick(
    event: MouseEvent
): void {

    const target =
        event.target;

    if (
        !(target instanceof Element)
    ) {
        return;
    }

    const button =
        target.closest<HTMLButtonElement>(
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

        selectedDate =
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

        selectedDate =
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

        selectedDate =
            null;

        void refreshArchive();
        return;
    }

    if (
        action ===
        "select-driver"
    ) {
        selectedDriverId =
            button.dataset.driverId ||
            null;

        selectedDate =
            null;

        ensureSelectedDate();
        renderDrivers();
        renderMain();
        return;
    }

    if (
        action ===
        "select-date"
    ) {
        selectedDate =
            button.dataset.date ||
            null;

        renderMain();
    }
}


export {
    renderSection
};


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
