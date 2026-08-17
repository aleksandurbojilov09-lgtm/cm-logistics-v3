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


let currentReport:
    AdminBioexisReport | null =
    null;


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



function monthLabel(
    monthStart: string
): string {

    const date =
        new Date(
            `${monthStart}T12:00:00Z`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return monthStart;
    }

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


function sanitizeFilePart(
    value: string
): string {

    return String(
        value || ""
    )
    .trim()
    .replace(
        /[^a-zA-Z0-9А-Яа-я_-]+/g,
        "_"
    )
    .replace(
        /^_+|_+$/g,
        ""
    );
}


function printableRow(
    row: AdminBioexisRow
): string {

    return `
        <tr>
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
                        ? escapeHtml(
                            row.companies ||
                            "-"
                        )
                        : `Отсечка ${escapeHtml(
                            String(
                                row.segmentNumber
                            )
                        )}`
                }
            </td>

            <td>
                ${escapeHtml(
                    row.truckNumber
                )}
            </td>

            <td class="bioexis-print-number">
                ${escapeHtml(
                    formatInteger(
                        row.startKm
                    )
                )}
            </td>

            <td class="bioexis-print-number">
                ${escapeHtml(
                    formatInteger(
                        row.endKm
                    )
                )}
            </td>

            <td class="bioexis-print-number">
                ${escapeHtml(
                    formatInteger(
                        row.km
                    )
                )}
            </td>

            <td class="bioexis-print-number">
                ${
                    row.loadedKg ===
                    null
                        ? ""
                        : escapeHtml(
                            formatTons(
                                row.loadedKg
                            )
                        )
                }
            </td>
        </tr>
    `;
}


function buildPrintableReportHtml(
    report:
        AdminBioexisReport
): string {

    const trailer =
        report.selectedTrailer;

    if (!trailer) {
        return "";
    }

    return `
        <article
            class="bioexis-print-document"
            id="k3BioexisPrintableReport"
        >
            <header
                class="bioexis-print-header"
            >
                <div>
                    <strong>
                        K3 Logistics
                    </strong>

                    <h1>
                        BIOEXIS - месечен отчет
                    </h1>
                </div>

                <div
                    class="bioexis-print-month"
                >
                    ${escapeHtml(
                        monthLabel(
                            report.month
                        )
                    )}
                </div>
            </header>

            <section
                class="bioexis-print-meta"
            >
                <div>
                    <span>
                        Ремарке
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

                <div>
                    <span>
                        Брой курсове
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatInteger(
                                report.summary.tripCount
                            )
                        )}
                    </strong>
                </div>
            </section>

            <table
                class="bioexis-print-table"
            >
                <thead>
                    <tr>
                        <th>Курс</th>
                        <th>Дата</th>
                        <th>Товарене</th>
                        <th>Камион</th>
                        <th>Начален км</th>
                        <th>Краен км</th>
                        <th>Км</th>
                        <th>Официален товар (кг)</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        report.rows.length > 0
                            ? report.rows
                                .map(
                                    printableRow
                                )
                                .join("")
                            : `
                                <tr>
                                    <td
                                        colspan="8"
                                        class="bioexis-print-empty"
                                    >
                                        Няма приключени курсове
                                        за избрания месец.
                                    </td>
                                </tr>
                            `
                    }
                </tbody>

                <tfoot>
                    <tr>
                        <td colspan="5"></td>

                        <th>
                            ОБЩО
                        </th>

                        <th
                            class="bioexis-print-number"
                        >
                            ${escapeHtml(
                                formatInteger(
                                    report.summary.totalKm
                                )
                            )}
                        </th>

                        <th
                            class="bioexis-print-number"
                        >
                            ${escapeHtml(
                                formatTons(
                                    report.summary.loadedKg
                                )
                            )}
                        </th>
                    </tr>
                </tfoot>
            </table>
        </article>
    `;
}


function closePreview():
void {

    const dialog =
        document
            .querySelector<HTMLDialogElement>(
                "#k3BioexisPreviewDialog"
            );

    if (
        dialog?.open
    ) {
        dialog.close();
    }
}


function openPreview(
    report:
        AdminBioexisReport
): void {

    const host =
        getHost();

    if (!host) {
        return;
    }

    let dialog =
        host
            .querySelector<HTMLDialogElement>(
                "#k3BioexisPreviewDialog"
            );

    if (!dialog) {

        dialog =
            document.createElement(
                "dialog"
            );

        dialog.id =
            "k3BioexisPreviewDialog";

        dialog.className =
            "bioexis-preview-dialog";

        host.appendChild(
            dialog
        );
    }

    dialog.innerHTML = `
        <div
            class="bioexis-preview-shell"
        >
            <div
                class="bioexis-preview-toolbar"
            >
                <strong>
                    Преглед на BIOEXIS отчет
                </strong>

                <div>
                    <button
                        type="button"
                        data-bioexis-action="print"
                    >
                        🖨️ Печат / PDF
                    </button>

                    <button
                        type="button"
                        class="bioexis-export-excel"
                        data-bioexis-action="excel"
                    >
                        📊 Excel
                    </button>

                    <button
                        type="button"
                        class="bioexis-preview-close"
                        data-bioexis-action="close-preview"
                    >
                        ✕ Затвори
                    </button>
                </div>
            </div>

            <div
                class="bioexis-preview-scroll"
            >
                ${buildPrintableReportHtml(
                    report
                )}
            </div>
        </div>
    `;

    if (
        !dialog.open
    ) {
        dialog.showModal();
    }
}


function printBioexisReport(
    report:
        AdminBioexisReport
): void {

    const trailer =
        report.selectedTrailer;

    if (!trailer) {
        window.alert(
            "Няма избрано ремарке."
        );

        return;
    }

    const reportHtml =
        buildPrintableReportHtml(
            report
        );

    if (!reportHtml) {
        window.alert(
            "Отчетът не може да бъде генериран."
        );

        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1400,height=900"
        );

    if (!printWindow) {

        window.alert(
            "Браузърът блокира прозореца за печат. Разреши pop-ups и опитай отново."
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        BIOEXIS -
        ${escapeHtml(
            trailer.registrationNumber
        )} -
        ${escapeHtml(
            monthLabel(
                report.month
            )
        )}
    </title>

    <style>
        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-family:
                Arial,
                Helvetica,
                sans-serif;
            font-size: 14px;
        }

        body {
            padding: 10mm;
        }

        .bioexis-print-document {
            width: 100%;
        }

        .bioexis-print-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #0f172a;
        }

        .bioexis-print-header strong {
            font-size: 16px;
        }

        .bioexis-print-header h1 {
            margin: 5px 0 0;
            font-size: 23px;
        }

        .bioexis-print-month {
            font-size: 16px;
            font-weight: 700;
        }

        .bioexis-print-meta {
            display: grid;
            grid-template-columns:
                repeat(
                    3,
                    minmax(0, 1fr)
                );
            gap: 10px;
            margin-bottom: 18px;
        }

        .bioexis-print-meta div {
            padding: 10px;
            border: 1px solid #cbd5e1;
        }

        .bioexis-print-meta span,
        .bioexis-print-meta strong {
            display: block;
        }

        .bioexis-print-meta span {
            margin-bottom: 4px;
            color: #475569;
        }

        .bioexis-print-table {
            width: 100%;
            border-collapse: collapse;
        }

        .bioexis-print-table th,
        .bioexis-print-table td {
            padding: 7px 8px;
            border: 1px solid #94a3b8;
            vertical-align: top;
        }

        .bioexis-print-table th {
            background: #e2e8f0;
            font-weight: 700;
            text-align: left;
        }

        .bioexis-print-number {
            text-align: right !important;
            white-space: nowrap;
        }

        .bioexis-print-empty {
            padding: 24px !important;
            text-align: center;
        }

        thead {
            display: table-header-group;
        }

        tfoot {
            display: table-footer-group;
        }

        tr,
        td,
        th {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        @page {
            size: A4 landscape;
            margin: 10mm;
        }

        @media print {
            body {
                padding: 0;
            }
        }
    </style>
</head>

<body>
    ${reportHtml}
</body>
</html>
    `);

    printWindow.document.close();

    window.setTimeout(
        () => {

            printWindow.focus();
            printWindow.print();

        },
        250
    );
}


async function exportBioexisExcel(
    report:
        AdminBioexisReport,
    button:
        HTMLButtonElement | null
): Promise<void> {

    const trailer =
        report.selectedTrailer;

    if (!trailer) {

        window.alert(
            "Няма избрано ремарке."
        );

        return;
    }

    const originalLabel =
        button?.textContent ||
        "";

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Генериране...";
    }

    try {

        const XLSX =
            await import(
                "xlsx"
            );

        const excelData:
            Array<
                Array<
                    string |
                    number
                >
            > = [

            [
                "K3 Logistics"
            ],

            [
                "BIOEXIS - месечен отчет"
            ],

            [],

            [
                "Ремарке",
                trailer.registrationNumber
            ],

            [
                "Разрешително BIOEXIS",
                trailer.bioexisPermitNumber ||
                "-"
            ],

            [
                "Отчетен месец",
                monthLabel(
                    report.month
                )
            ],

            [
                "Брой курсове",
                report.summary.tripCount
            ],

            [],

            [
                "Курс",
                "Дата",
                "Товарене",
                "Камион",
                "Начален км",
                "Краен км",
                "Км",
                "Официален товар (кг)"
            ]
        ];


        for (
            const row
            of report.rows
        ) {

            excelData.push(
                [
                    row.firstSegment
                        ? `#${row.tripNumber}`
                        : "↳",

                    row.firstSegment
                        ? dateLabel(
                            row.completedDate
                        )
                        : "",

                    row.firstSegment
                        ? (
                            row.companies ||
                            "-"
                        )
                        : (
                            "Отсечка " +
                            row.segmentNumber
                        ),

                    row.truckNumber,

                    row.startKm,

                    row.endKm,

                    row.km,

                    row.loadedKg ===
                        null
                            ? ""
                            : row.loadedKg
                ]
            );
        }


        excelData.push(
            []
        );

        excelData.push(
            [
                "",
                "",
                "",
                "",
                "",
                "ОБЩО",
                report.summary.totalKm,
                report.summary.loadedKg
            ]
        );


        const worksheet =
            XLSX.utils
                .aoa_to_sheet(
                    excelData
                );


        worksheet["!cols"] = [
            {
                wch: 10
            },
            {
                wch: 14
            },
            {
                wch: 34
            },
            {
                wch: 16
            },
            {
                wch: 15
            },
            {
                wch: 15
            },
            {
                wch: 12
            },
            {
                wch: 14
            }
        ];


        const workbook =
            XLSX.utils
                .book_new();


        XLSX.utils
            .book_append_sheet(
                workbook,
                worksheet,
                "BIOEXIS"
            );


        const monthPart =
            report.month
                .slice(
                    0,
                    7
                )
                .replace(
                    "-",
                    "_"
                );


        const trailerPart =
            sanitizeFilePart(
                trailer.registrationNumber
            ) ||
            "trailer";


        const fileName =
            `K3_BIOEXIS_${trailerPart}_${monthPart}.xlsx`;


        XLSX.writeFileXLSX(
            workbook,
            fileName,
            {
                compression:
                    true
            }
        );

    } catch (error) {

        console.error(
            "BIOEXIS Excel export failed:",
            error
        );

        window.alert(
            "Excel файлът не можа да бъде генериран."
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalLabel;
        }
    }
}


function handleBioexisAction(
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
            "[data-bioexis-action]"
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset
            .bioexisAction;

    if (
        action ===
        "close-preview"
    ) {

        closePreview();

        return;
    }

    const report =
        currentReport;

    if (!report) {
        return;
    }

    if (
        action ===
        "preview"
    ) {

        openPreview(
            report
        );

        return;
    }

    if (
        action ===
        "print"
    ) {

        printBioexisReport(
            report
        );

        return;
    }

    if (
        action ===
        "excel"
    ) {

        void exportBioexisExcel(
            report,
            button
        );
    }
}


function bindBioexisActions():
void {

    const host =
        getHost();

    if (
        !host ||
        host.dataset
            .bioexisActionsBound ===
            "true"
    ) {
        return;
    }

    host.dataset
        .bioexisActionsBound =
        "true";

    host.addEventListener(
        "click",
        handleBioexisAction
    );
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
                    row.loadedKg ===
                    null
                        ? ""
                        : escapeHtml(
                            formatTons(
                                row.loadedKg
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
                        Официалният товар е по
                        кантара в BIOEXIS и се брои
                        веднъж за курс. Километражът
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
                class="bioexis-export-toolbar"
                aria-label="Експорт на BIOEXIS отчет"
            >
                <button
                    type="button"
                    data-bioexis-action="preview"
                >
                    👁️ Преглед
                </button>

                <button
                    type="button"
                    data-bioexis-action="print"
                >
                    🖨️ Печат / PDF
                </button>

                <button
                    type="button"
                    class="bioexis-export-excel"
                    data-bioexis-action="excel"
                >
                    📊 Excel
                </button>
            </section>

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
                        Официален товар
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                report.summary
                                    .loadedKg
                            )
                        )} кг
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
                                                Килограми
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

    currentReport =
        null;

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

        currentReport =
            report;

        host.innerHTML =
            renderReport(
                report
            );

        bindTrailerSelect(
            monthStart
        );

        bindBioexisActions();

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
