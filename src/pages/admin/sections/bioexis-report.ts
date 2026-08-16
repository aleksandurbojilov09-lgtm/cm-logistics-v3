import "./bioexis-report.css";

import {
    loadAdminBioexisReport,
    type AdminBioexisReport,
    type AdminBioexisRow
} from "../../../features/trips/admin-bioexis-report-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


const BUSINESS_TIMEZONE =
    "Europe/Sofia";


let selectedTrailerId:
    string | null =
    null;

let reportRenderVersion =
    0;


function getHost():
HTMLElement | null {

    return document
        .querySelector<HTMLElement>(
            "#k3BioexisArchiveView"
        );
}


function formatInteger(
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


function dateLabel(
    value: string
): string {

    if (!value) {
        return "-";
    }

    const date =
        new Date(
            `${value}T12:00:00Z`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
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
                    "numeric"
            }
        )
        .format(date);
}


function renderLoading():
string {

    return `
        <div
            class="bioexis-loading"
        >
            Зареждане на BIOEXIS отчета...
        </div>
    `;
}


function renderError(
    message: string
): string {

    return `
        <div
            class="bioexis-error"
        >
            ${escapeHtml(
                message
            )}
        </div>
    `;
}


function renderEmpty():
string {

    return `
        <div
            class="bioexis-empty"
        >
            Няма приключени курсове
            за избраното ремарке
            през този месец.
        </div>
    `;
}


function renderTrailerOptions(
    report:
        AdminBioexisReport
): string {

    return report.trailers
        .map(
            trailer => `
                <option
                    value="${escapeHtml(
                        trailer.id
                    )}"
                    ${
                        report.selectedTrailer
                            ?.id ===
                            trailer.id
                                ? "selected"
                                : ""
                    }
                >
                    ${escapeHtml(
                        trailer.registrationNumber
                    )}
                    ${
                        trailer.bioexisPermitNumber
                            ? ` · разрешително ${escapeHtml(
                                trailer.bioexisPermitNumber
                            )}`
                            : ""
                    }
                </option>
            `
        )
        .join("");
}


function renderRow(
    row: AdminBioexisRow
): string {

    return `
        <tr
            class="${
                row.firstSegment
                    ? "bioexis-trip-first-row"
                    : "bioexis-trip-continuation-row"
            }"
        >
            <td>
                ${
                    row.firstSegment
                        ? escapeHtml(
                            dateLabel(
                                row.completedDate
                            )
                        )
                        : ""
                }
            </td>

            <td>
                ${
                    row.firstSegment
                        ? `#${escapeHtml(
                            String(
                                row.tripNumber
                            )
                        )}`
                        : "↳"
                }
            </td>

            <td
                class="bioexis-companies-cell"
            >
                ${
                    row.firstSegment
                        ? escapeHtml(
                            row.companies ||
                            "-"
                        )
                        : ""
                }
            </td>

            <td>
                ${escapeHtml(
                    row.truckNumber
                )}
            </td>

            <td>
                ${escapeHtml(
                    row.driverName
                )}
            </td>

            <td
                class="bioexis-number-cell"
            >
                ${escapeHtml(
                    formatInteger(
                        row.startKm
                    )
                )}
            </td>

            <td
                class="bioexis-number-cell"
            >
                ${escapeHtml(
                    formatInteger(
                        row.endKm
                    )
                )}
            </td>

            <td
                class="bioexis-number-cell bioexis-km-cell"
            >
                ${escapeHtml(
                    formatInteger(
                        row.km
                    )
                )}
            </td>

            <td
                class="bioexis-number-cell bioexis-tons-cell"
            >
                ${
                    row.loadedTons ===
                    null
                        ? ""
                        : escapeHtml(
                            formatTons(
                                row.loadedTons
                            )
                        )
                }
            </td>
        </tr>
    `;
}


function renderReport(
    report:
        AdminBioexisReport
): string {

    const trailer =
        report.selectedTrailer;

    if (!trailer) {
        return `
            <div
                class="bioexis-empty"
            >
                Няма въведени ремаркета.
            </div>
        `;
    }

    return `
        <section
            class="bioexis-report"
        >
            <header
                class="bioexis-report-header"
            >
                <div
                    class="bioexis-report-title"
                >
                    <span>
                        🚛 BIOEXIS
                    </span>

                    <strong>
                        Месечен отчет по ремарке
                    </strong>

                    <small>
                        Товарът се брои веднъж
                        за курс, а километражът
                        следва реалните сегменти.
                    </small>
                </div>

                <label
                    class="bioexis-trailer-select"
                >
                    <span>
                        Ремарке
                    </span>

                    <select
                        id="k3BioexisTrailerSelect"
                    >
                        ${renderTrailerOptions(
                            report
                        )}
                    </select>
                </label>
            </header>

            <section
                class="bioexis-trailer-card"
            >
                <div>
                    <span>
                        Регистрационен номер
                    </span>

                    <strong>
                        ${escapeHtml(
                            trailer.registrationNumber
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        BIOEXIS разрешително
                    </span>

                    <strong>
                        ${escapeHtml(
                            trailer.bioexisPermitNumber ||
                            "-"
                        )}
                    </strong>
                </div>
            </section>

            <section
                class="bioexis-summary"
            >
                <article>
                    <span>
                        Курсове
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatInteger(
                                report.summary
                                    .tripCount
                            )
                        )}
                    </strong>
                </article>

                <article>
                    <span>
                        Общо км
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatInteger(
                                report.summary
                                    .totalKm
                            )
                        )} км
                    </strong>
                </article>

                <article>
                    <span>
                        Реален товар
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                report.summary
                                    .loadedTons
                            )
                        )} т.
                    </strong>
                </article>
            </section>

            ${
                report.rows.length ===
                0
                    ? renderEmpty()
                    : `
                        <section
                            class="bioexis-table-card"
                        >
                            <div
                                class="bioexis-table-title"
                            >
                                <strong>
                                    Отчетни редове
                                </strong>

                                <small>
                                    При курс с handoff
                                    има повече от един
                                    километров ред.
                                </small>
                            </div>

                            <div
                                class="bioexis-table-scroll"
                            >
                                <table
                                    class="bioexis-table"
                                >
                                    <thead>
                                        <tr>
                                            <th>
                                                Дата
                                            </th>

                                            <th>
                                                Курс
                                            </th>

                                            <th>
                                                Фирми
                                            </th>

                                            <th>
                                                Камион
                                            </th>

                                            <th>
                                                Шофьор
                                            </th>

                                            <th>
                                                Нач. км
                                            </th>

                                            <th>
                                                Краен км
                                            </th>

                                            <th>
                                                Км
                                            </th>

                                            <th>
                                                Тонове
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        ${report.rows
                                            .map(
                                                renderRow
                                            )
                                            .join("")}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    `
            }
        </section>
    `;
}


function bindTrailerSelect(
    monthStart: string
): void {

    const select =
        document
            .querySelector<HTMLSelectElement>(
                "#k3BioexisTrailerSelect"
            );

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {

            selectedTrailerId =
                select.value ||
                null;

            void renderBioexisReport(
                monthStart
            );
        }
    );
}


export async function
renderBioexisReport(
    monthStart: string
): Promise<void> {

    const host =
        getHost();

    if (!host) {
        return;
    }

    const currentVersion =
        ++reportRenderVersion;

    host.innerHTML =
        renderLoading();

    try {

        const report =
            await loadAdminBioexisReport(
                monthStart,
                selectedTrailerId
            );

        if (
            currentVersion !==
            reportRenderVersion
        ) {
            return;
        }

        if (
            !host.isConnected
        ) {
            return;
        }

        selectedTrailerId =
            report.selectedTrailer
                ?.id ||
            null;

        host.innerHTML =
            renderReport(
                report
            );

        bindTrailerSelect(
            monthStart
        );

    } catch (error) {

        if (
            currentVersion !==
            reportRenderVersion
        ) {
            return;
        }

        const message =
            error instanceof Error &&
            error.message
                ? error.message
                : "BIOEXIS отчетът не можа да бъде зареден.";

        host.innerHTML =
            renderError(
                message
            );
    }
}
