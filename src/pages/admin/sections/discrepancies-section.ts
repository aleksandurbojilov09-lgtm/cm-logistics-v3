import "./discrepancies-section.css";

import {
    loadAdminDiscrepancies,
    markAdminDiscrepancyReviewed,
    type AdminDiscrepancy
} from "../../../features/discrepancies/admin-discrepancy-service";

import {
    escapeHtml
} from "../../../shared/lib/html";

import {
    isUserEditing
} from "../../../shared/lib/user-editing";


type DiscrepancyView =
    | "reported"
    | "archive";


let discrepancies:
    AdminDiscrepancy[] =
    [];


let activeView:
    DiscrepancyView =
    "reported";


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
            id="k3DiscrepanciesSection"
            class="discrepancies-section"
        >

            <div
                id="k3DiscrepanciesMessage"
                class="discrepancies-message"
                aria-live="polite"
            ></div>


            <div
                class="discrepancies-summary"
            >

                <article
                    class="discrepancies-summary-card"
                >
                    <span>
                        Непрегледани
                    </span>

                    <strong
                        id="k3DiscrepanciesReportedCount"
                    >
                        0
                    </strong>
                </article>


                <article
                    class="discrepancies-summary-card"
                >
                    <span>
                        Прегледани
                    </span>

                    <strong
                        id="k3DiscrepanciesReviewedCount"
                    >
                        0
                    </strong>
                </article>


                <article
                    class="discrepancies-summary-card"
                >
                    <span>
                        Общо история
                    </span>

                    <strong
                        id="k3DiscrepanciesTotalCount"
                    >
                        0
                    </strong>
                </article>

            </div>


            <section
                class="discrepancies-panel"
            >

                <header
                    class="discrepancies-panel-header"
                >

                    <div>
                        <h3>
                            ⚠️ Несъответствия при товарене
                        </h3>

                        <p>
                            Сигнали от шофьорите.
                            „Прегледано“ не изтрива историята.
                        </p>
                    </div>


                    <button
                        type="button"
                        class="discrepancies-refresh-button"
                        data-discrepancy-action="refresh"
                    >
                        ↻ Обнови
                    </button>

                </header>


                <div
                    class="discrepancies-tabs"
                >

                    <button
                        type="button"
                        class="
                            discrepancies-tab
                            discrepancies-tab-active
                        "
                        data-discrepancy-view="reported"
                    >
                        ⚠️ Непрегледани
                    </button>


                    <button
                        type="button"
                        class="discrepancies-tab"
                        data-discrepancy-view="archive"
                    >
                        📚 Архив по фирми
                    </button>

                </div>


                <div
                    id="k3DiscrepanciesContent"
                    class="discrepancies-content"
                >
                    <div
                        class="discrepancies-empty"
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
        "#k3DiscrepanciesSection"
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


function formatSignedTons(
    value: number
): string {

    const sign =
        value > 0
            ? "+"
            : "";


    return `${sign}${formatTons(
        value
    )} т.`;
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


function differenceDescription(
    item: AdminDiscrepancy
): string {

    if (
        item.differenceTons < 0
    ) {

        return `Натоварени са с ${formatTons(
            Math.abs(
                item.differenceTons
            )
        )} т. по-малко.`;
    }


    if (
        item.differenceTons > 0
    ) {

        return `Натоварени са с ${formatTons(
            item.differenceTons
        )} т. повече.`;
    }


    return "Реалното количество съвпада със зачисленото.";
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
            "#k3DiscrepanciesMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "discrepancies-message";


    if (type) {

        element.classList.add(
            `discrepancies-message-${type}`
        );
    }
}


/* =========================================================
   COUNTERS
   ========================================================= */


function renderCounters():
void {

    const reported =
        discrepancies.filter(
            item =>
                item.status ===
                    "reported"
        ).length;


    const reviewed =
        discrepancies.filter(
            item =>
                item.status ===
                    "reviewed"
        ).length;


    const reportedElement =
        document.querySelector<
            HTMLElement
        >(
            "#k3DiscrepanciesReportedCount"
        );


    const reviewedElement =
        document.querySelector<
            HTMLElement
        >(
            "#k3DiscrepanciesReviewedCount"
        );


    const totalElement =
        document.querySelector<
            HTMLElement
        >(
            "#k3DiscrepanciesTotalCount"
        );


    if (reportedElement) {
        reportedElement.textContent =
            String(reported);
    }


    if (reviewedElement) {
        reviewedElement.textContent =
            String(reviewed);
    }


    if (totalElement) {
        totalElement.textContent =
            String(
                discrepancies.length
            );
    }
}


/* =========================================================
   CARD
   ========================================================= */


function renderDiscrepancyCard(
    item: AdminDiscrepancy,
    allowReview:
        boolean
): string {

    const reviewed =
        item.status ===
            "reviewed";


    const differenceClass =
        item.differenceTons < 0

            ? "discrepancy-difference-negative"

            : item.differenceTons > 0

                ? "discrepancy-difference-positive"

                : "discrepancy-difference-zero";


    return `
        <article
            class="
                discrepancy-card
                ${
                    reviewed
                        ? "discrepancy-card-reviewed"
                        : ""
                }
            "
        >

            <header
                class="discrepancy-card-header"
            >

                <div>
                    <strong>
                        ⚠️
                        ${escapeHtml(
                            item.companyName ||
                            "Фирма"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            formatDate(
                                item.createdAt
                            )
                        )}
                    </span>
                </div>


                <span
                    class="
                        discrepancy-status
                        ${
                            reviewed
                                ? "discrepancy-status-reviewed"
                                : "discrepancy-status-reported"
                        }
                    "
                >
                    ${
                        reviewed
                            ? "✅ Прегледано"
                            : "⚠️ Непрегледано"
                    }
                </span>

            </header>


            <div
                class="discrepancy-tons-grid"
            >

                <div>
                    <span>
                        Зачислени
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                item.assignedTons
                            )
                        )}
                        т.
                    </strong>
                </div>


                <div>
                    <span>
                        Реално
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                item.actualLoadedTons
                            )
                        )}
                        т.
                    </strong>
                </div>


                <div
                    class="${differenceClass}"
                >
                    <span>
                        Разлика
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatSignedTons(
                                item.differenceTons
                            )
                        )}
                    </strong>
                </div>

            </div>


            <div
                class="discrepancy-description"
            >
                ${escapeHtml(
                    differenceDescription(
                        item
                    )
                )}
            </div>


            <div
                class="discrepancy-meta"
            >
                <span>
                    👨‍✈️
                    ${escapeHtml(
                        item.driverName ||
                        "-"
                    )}
                </span>

                <span>
                    🚛
                    ${escapeHtml(
                        item.truckNumber ||
                        "-"
                    )}
                </span>
            </div>


            ${
                item.note

                    ? `
                        <div
                            class="discrepancy-note"
                        >
                            📝
                            ${escapeHtml(
                                item.note
                            )}
                        </div>
                    `

                    : ""
            }


            ${
                reviewed &&
                item.resolvedAt

                    ? `
                        <div
                            class="discrepancy-reviewed-at"
                        >
                            ✅ Прегледано:
                            ${escapeHtml(
                                formatDate(
                                    item.resolvedAt
                                )
                            )}
                        </div>
                    `

                    : ""
            }


            ${
                allowReview &&
                !reviewed

                    ? `
                        <button
                            type="button"
                            class="discrepancy-review-button"
                            data-discrepancy-action="review"
                            data-discrepancy-id="${escapeHtml(
                                item.id
                            )}"
                        >
                            ✅ Прегледано
                        </button>
                    `

                    : ""
            }

        </article>
    `;
}


/* =========================================================
   REPORTED
   ========================================================= */


function renderReported():
string {

    const items =
        discrepancies.filter(
            item =>
                item.status ===
                    "reported"
        );


    if (
        items.length === 0
    ) {

        return `
            <div
                class="discrepancies-empty"
            >
                ✅ Няма непрегледани несъответствия.
            </div>
        `;
    }


    return `
        <div
            class="discrepancies-list"
        >
            ${
                items
                    .map(
                        item =>
                            renderDiscrepancyCard(
                                item,
                                true
                            )
                    )
                    .join("")
            }
        </div>
    `;
}


/* =========================================================
   ARCHIVE
   ========================================================= */


type CompanyGroup = {
    companyId: string;
    companyName: string;
    items: AdminDiscrepancy[];
};


function groupByCompany():
CompanyGroup[] {

    const groups =
        new Map<
            string,
            CompanyGroup
        >();


    for (
        const item
        of discrepancies
    ) {

        const key =
            item.companyId ||
            item.companyName;


        let group =
            groups.get(
                key
            );


        if (!group) {

            group = {
                companyId:
                    item.companyId,

                companyName:
                    item.companyName ||
                    "Фирма",

                items:
                    []
            };


            groups.set(
                key,
                group
            );
        }


        group.items.push(
            item
        );
    }


    return Array.from(
        groups.values()
    )
        .sort(
            (
                first,
                second
            ) => {

                const firstDate =
                    new Date(
                        first.items[0]
                            ?.createdAt ||
                        0
                    ).getTime();


                const secondDate =
                    new Date(
                        second.items[0]
                            ?.createdAt ||
                        0
                    ).getTime();


                return (
                    secondDate -
                    firstDate
                );
            }
        );
}


function renderArchiveItem(
    item:
        AdminDiscrepancy
): string {

    const reviewed =
        item.status ===
            "reviewed";


    const differenceClass =
        item.differenceTons < 0

            ? "discrepancy-difference-negative"

            : item.differenceTons > 0

                ? "discrepancy-difference-positive"

                : "discrepancy-difference-zero";


    return `
        <details
            class="discrepancy-archive-item"
        >
            <summary
                class="discrepancy-archive-item-summary"
            >
                <span
                    class="discrepancy-archive-item-date"
                >
                    ${escapeHtml(
                        formatDate(
                            item.createdAt
                        )
                    )}
                </span>


                <strong
                    class="${differenceClass}"
                >
                    ${escapeHtml(
                        formatSignedTons(
                            item.differenceTons
                        )
                    )}
                </strong>


                <span
                    class="discrepancy-archive-item-truck"
                >
                    🚛
                    ${escapeHtml(
                        item.truckNumber ||
                        "-"
                    )}
                </span>


                <span
                    class="
                        discrepancy-archive-item-status
                        ${
                            reviewed
                                ? "discrepancy-archive-item-reviewed"
                                : "discrepancy-archive-item-pending"
                        }
                    "
                >
                    ${
                        reviewed
                            ? "✅ Прегледано"
                            : "⚠️ Непрегледано"
                    }
                </span>


                <span
                    class="discrepancy-archive-item-chevron"
                    aria-hidden="true"
                >
                    ▾
                </span>
            </summary>


            <div
                class="discrepancy-archive-item-detail"
            >
                ${renderDiscrepancyCard(
                    item,
                    false
                )}
            </div>
        </details>
    `;
}


function renderArchive():
string {

    const groups =
        groupByCompany();


    if (
        groups.length === 0
    ) {

        return `
            <div
                class="discrepancies-empty"
            >
                Все още няма регистрирани
                несъответствия.
            </div>
        `;
    }


    return `
        <div
            class="discrepancy-company-list"
        >

            ${
                groups
                    .map(
                        group => {

                            const reportedCount =
                                group.items.filter(
                                    item =>
                                        item.status ===
                                            "reported"
                                ).length;


                            const reviewedCount =
                                group.items.length -
                                reportedCount;


                            const latestItem =
                                group.items[0] ||
                                null;


                            return `
                                <details
                                    class="discrepancy-company-group"
                                >

                                    <summary
                                        class="discrepancy-company-header"
                                    >
                                        <div
                                            class="discrepancy-company-main"
                                        >
                                            <strong>
                                                🏢
                                                ${escapeHtml(
                                                    group.companyName
                                                )}
                                            </strong>

                                            <span>
                                                ${group.items.length}
                                                ${
                                                    group.items.length === 1
                                                        ? "сигнал"
                                                        : "сигнала"
                                                }

                                                ${
                                                    latestItem
                                                        ? `· Последен: ${escapeHtml(
                                                            formatDate(
                                                                latestItem.createdAt
                                                            )
                                                        )}`
                                                        : ""
                                                }
                                            </span>
                                        </div>


                                        <div
                                            class="discrepancy-company-summary"
                                        >
                                            ${
                                                reportedCount > 0

                                                    ? `
                                                        <span
                                                            class="discrepancy-company-pending"
                                                        >
                                                            ⚠️
                                                            ${reportedCount}
                                                            непрегледани
                                                        </span>
                                                    `

                                                    : ""
                                            }


                                            ${
                                                reviewedCount > 0

                                                    ? `
                                                        <span
                                                            class="discrepancy-company-ok"
                                                        >
                                                            ✅
                                                            ${reviewedCount}
                                                            прегледани
                                                        </span>
                                                    `

                                                    : ""
                                            }


                                            <span
                                                class="discrepancy-company-chevron"
                                                aria-hidden="true"
                                            >
                                                ▾
                                            </span>
                                        </div>
                                    </summary>


                                    <div
                                        class="discrepancy-company-items"
                                    >
                                        ${
                                            group.items
                                                .map(
                                                    renderArchiveItem
                                                )
                                                .join("")
                                        }
                                    </div>

                                </details>
                            `;
                        }
                    )
                    .join("")
            }

        </div>
    `;
}


/* =========================================================
   RENDER
   ========================================================= */


function updateTabs():
void {

    const buttons =
        document.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-discrepancy-view]"
        );


    buttons.forEach(
        button => {

            const selected =
                button.dataset
                    .discrepancyView ===
                activeView;


            button.classList.toggle(
                "discrepancies-tab-active",
                selected
            );
        }
    );
}


function renderContent():
void {

    const content =
        document.querySelector<
            HTMLElement
        >(
            "#k3DiscrepanciesContent"
        );


    if (!content) {
        return;
    }


    renderCounters();

    updateTabs();


    content.innerHTML =
        activeView ===
            "reported"

            ? renderReported()

            : renderArchive();
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refresh():
Promise<void> {

    const version =
        ++refreshVersion;


    try {

        const next =
            await loadAdminDiscrepancies();


        if (
            version !==
                refreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        discrepancies =
            next;


        renderContent();


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


                if (isUserEditing()) {
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
   REVIEW
   ========================================================= */


async function reviewDiscrepancy(
    button: HTMLButtonElement
): Promise<void> {

    const discrepancyId =
        button.dataset
            .discrepancyId;


    if (!discrepancyId) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Записване...";


    try {

        await markAdminDiscrepancyReviewed(
            discrepancyId
        );


        await refresh();


        setMessage(
            "✅ Сигналът е отбелязан като прегледан и остава в архива.",
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
            "✅ Прегледано";
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


    const viewButton =
        target.closest<
            HTMLButtonElement
        >(
            "[data-discrepancy-view]"
        );


    if (viewButton) {

        const view =
            viewButton.dataset
                .discrepancyView;


        if (
            view === "reported" ||
            view === "archive"
        ) {

            activeView =
                view;


            renderContent();
        }


        return;
    }


    const actionButton =
        target.closest<
            HTMLButtonElement
        >(
            "[data-discrepancy-action]"
        );


    if (!actionButton) {
        return;
    }


    const action =
        actionButton.dataset
            .discrepancyAction;


    if (
        action === "refresh"
    ) {

        actionButton.disabled =
            true;


        await refresh();


        actionButton.disabled =
            false;


        return;
    }


    if (
        action === "review"
    ) {

        await reviewDiscrepancy(
            actionButton
        );
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
