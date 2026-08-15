import "./orders-section.css";
import "./orders-assignment.css";

import {
    loadClientManagementSnapshot,
    type ClientManagementSnapshot
} from "../../../features/clients/client-service";

import {
    assignOrderLoad,
    loadAdminOrdersWorkspace,
    type AdminOrderAssignment,
    type AdminOrderListItem,
    type AdminOrderStatus,
    type ReadyOrderComposition
} from "../../../features/orders/admin-orders-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


let clients:
    ClientManagementSnapshot | null =
    null;

let orders:
    AdminOrderListItem[] =
    [];

let compositions:
    ReadyOrderComposition[] =
    [];

let refreshVersion =
    0;


export function renderSection():
string {

    return `
        <section
            id="k3OrdersSection"
            class="orders-section"
        >

            <div
                id="k3OrdersPageMessage"
                class="orders-page-message"
                aria-live="polite"
            ></div>


            <section
                class="orders-panel"
            >

                <header
                    class="orders-panel-header"
                >

                    <div>
                        <h3>
                            📦 Заявки за зачисляване
                        </h3>

                        <p>
                            Заявки с оставащо количество,
                            които могат да бъдат зачислени
                            към готова композиция.
                        </p>
                    </div>


                    <span
                        id="k3ActiveOrdersCount"
                        class="orders-count"
                    >
                        0
                    </span>

                </header>


                <div
                    id="k3ActiveOrdersList"
                    class="orders-list"
                >
                    <div
                        class="orders-loading"
                    >
                        Зареждане...
                    </div>
                </div>

            </section>


            <section
                class="
                    orders-panel
                    client-management-panel
                "
            >

                <header
                    class="orders-panel-header"
                >

                    <div>
                        <h3>
                            🏢 Клиенти и обекти
                        </h3>

                        <p>
                            Фирма → обекти →
                            клиентски акаунти
                        </p>
                    </div>

                </header>


                <div
                    id="k3ClientManagement"
                    class="client-management"
                >
                    <div
                        class="orders-loading"
                    >
                        Зареждане...
                    </div>
                </div>

            </section>

        </section>
    `;
}


function getRoot():
HTMLElement | null {

    return document.querySelector(
        "#k3OrdersSection"
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

    if (
        Number.isInteger(value)
    ) {
        return String(value);
    }

    return value
        .toFixed(3)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
}


function formatDate(
    value: string
): string {

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


function statusLabel(
    status: AdminOrderStatus
): string {

    switch (status) {

        case "pending":
            return "🔴 Необработена";

        case "partial":
            return "🟡 Частично зачислена";

        case "assigned":
            return "🟢 Зачислена";

        case "in_progress":
            return "🔵 В курс";

        case "completed":
            return "✅ Приключена";

        case "cancelled":
            return "⛔ Отказана";
    }
}


function assignmentStatusLabel(
    status:
        AdminOrderAssignment["status"]
): string {

    switch (status) {

        case "assigned":
            return "Зачислено";

        case "accepted":
            return "Прието";

        case "en_route":
            return "На път";

        case "arrived":
            return "Пристигнал";

        case "loaded":
            return "Натоварено";

        case "completed":
            return "Приключено";

        case "cancelled":
            return "Отказано";
    }
}


function setPageMessage(
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
            "#k3OrdersPageMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "orders-page-message";

    if (type) {
        element.classList.add(
            `orders-page-message-${type}`
        );
    }
}


function getOrder(
    orderId: string
): AdminOrderListItem | null {

    return (
        orders.find(
            order =>
                order.id === orderId
        ) ||
        null
    );
}


function getComposition(
    truckId: string
): ReadyOrderComposition | null {

    return (
        compositions.find(
            item =>
                item.truckId === truckId
        ) ||
        null
    );
}


function renderAssignmentHistory(
    order: AdminOrderListItem
): string {

    if (
        order.assignments.length === 0
    ) {
        return "";
    }

    return `
        <div
            class="order-assignment-history"
        >

            <div
                class="order-subtitle"
            >
                🚛 Зачислявания
            </div>


            ${
                order.assignments
                    .map(
                        assignment => `
                            <div
                                class="order-assignment-row"
                            >

                                <div>
                                    <strong>
                                        🚛
                                        ${escapeHtml(
                                            assignment
                                                .truckNumber ||
                                            "Камион"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            assignment
                                                .driverName ||
                                            "-"
                                        )}
                                    </span>
                                </div>


                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            formatTons(
                                                assignment
                                                    .assignedTons
                                            )
                                        )}
                                        т.
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            assignmentStatusLabel(
                                                assignment
                                                    .status
                                            )
                                        )}
                                    </span>
                                </div>


                                <div>
                                    <strong>
                                        🛻
                                        ${escapeHtml(
                                            assignment
                                                .trailerNumber ||
                                            "-"
                                        )}
                                    </strong>

                                    <span>
                                        ${
                                            assignment
                                                .trailerPermit

                                                ? `Permit ${escapeHtml(
                                                    assignment
                                                        .trailerPermit
                                                )}`

                                                : ""
                                        }
                                    </span>
                                </div>

                            </div>
                        `
                    )
                    .join("")
            }

        </div>
    `;
}


function compositionOptions(
    order: AdminOrderListItem
): string {

    const available =
        compositions.filter(
            composition =>
                Math.min(
                    order.remainingTons,
                    composition.freeTons
                ) > 0
        );


    if (
        available.length === 0
    ) {
        return `
            <option value="">
                Няма свободна готова композиция
            </option>
        `;
    }


    return `
        <option value="">
            -- Избери камион --
        </option>

        ${
            available
                .map(
                    composition => `
                        <option
                            value="${escapeHtml(
                                composition.truckId
                            )}"
                        >
                            ${escapeHtml(
                                composition.truckNumber
                            )}
                            —
                            ${escapeHtml(
                                composition.driverName
                            )}
                            —
                            ${escapeHtml(
                                formatTons(
                                    composition.currentLoadTons
                                )
                            )}/24 т.
                            —
                            свободни
                            ${escapeHtml(
                                formatTons(
                                    composition.freeTons
                                )
                            )}
                            т.
                        </option>
                    `
                )
                .join("")
        }
    `;
}


function renderAssignmentControls(
    order: AdminOrderListItem
): string {

    if (
        order.remainingTons <= 0
    ) {
        return "";
    }


    const hasAvailable =
        compositions.some(
            composition =>
                Math.min(
                    order.remainingTons,
                    composition.freeTons
                ) > 0
        );


    return `
        <div
            class="order-assignment-controls"
        >

            <div
                class="order-subtitle"
            >
                🚛 Зачисляване
            </div>


            <select
                id="k3OrderTruck-${escapeHtml(
                    order.id
                )}"
                data-order-truck-select="${escapeHtml(
                    order.id
                )}"
            >
                ${compositionOptions(order)}
            </select>


            <div
                class="order-assignment-tons-row"
            >

                <label>
                    Тонове

                    <input
                        id="k3OrderTons-${escapeHtml(
                            order.id
                        )}"
                        type="number"
                        min="0.001"
                        max="${escapeHtml(
                            order.remainingTons
                        )}"
                        step="0.001"
                        value="${escapeHtml(
                            order.remainingTons
                        )}"
                        ${
                            hasAvailable
                                ? ""
                                : "disabled"
                        }
                    />
                </label>


                <button
                    type="button"
                    class="order-assign-button"
                    data-orders-action="assign-load"
                    data-order-id="${escapeHtml(
                        order.id
                    )}"
                    ${
                        hasAvailable
                            ? ""
                            : "disabled"
                    }
                >
                    🚛 Зачисли
                </button>

            </div>


            <div
                id="k3OrderCapacity-${escapeHtml(
                    order.id
                )}"
                class="order-capacity-message"
            >
                ${
                    hasAvailable
                        ? "Избери готова композиция."
                        : "Няма свободна готова композиция."
                }
            </div>

        </div>
    `;
}


function renderOrderCard(
    order: AdminOrderListItem
): string {

    return `
        <article
            class="order-card"
        >

            <header
                class="order-card-header"
            >

                <div>
                    <strong>
                        🏢
                        ${escapeHtml(
                            order.companyName ||
                            "Фирма"
                        )}
                    </strong>

                    <span>
                        Заявка
                        #${escapeHtml(
                            order.orderNumber
                        )}
                        •
                        ${escapeHtml(
                            formatDate(
                                order.createdAt
                            )
                        )}
                    </span>
                </div>


                <div
                    class="
                        order-status
                        order-status-${escapeHtml(
                            order.status
                        )}
                    "
                >
                    ${escapeHtml(
                        statusLabel(
                            order.status
                        )
                    )}
                </div>

            </header>


            <div
                class="order-card-grid"
            >

                <div
                    class="order-info"
                >
                    <span>
                        Обект
                    </span>

                    <strong>
                        📍
                        ${escapeHtml(
                            order.siteName
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            order.siteAddress
                        )}
                    </small>
                </div>


                <div
                    class="order-info"
                >
                    <span>
                        Заявени
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.requestedTons
                            )
                        )}
                        т.
                    </strong>
                </div>


                <div
                    class="order-info"
                >
                    <span>
                        Зачислени
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.assignedTons
                            )
                        )}
                        т.
                    </strong>
                </div>


                <div
                    class="
                        order-info
                        order-info-remaining
                    "
                >
                    <span>
                        Остатък
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.remainingTons
                            )
                        )}
                        т.
                    </strong>
                </div>

            </div>


            ${
                order.note

                    ? `
                        <div
                            class="order-note"
                        >
                            📝
                            ${escapeHtml(
                                order.note
                            )}
                        </div>
                    `

                    : ""
            }


            ${renderAssignmentHistory(order)}

            ${renderAssignmentControls(order)}

        </article>
    `;
}


function renderOrders():
void {

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersList"
        );

    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            orders.length
        );


    if (
        orders.length === 0
    ) {

        list.innerHTML = `
            <div
                class="orders-empty"
            >
                В момента няма заявки
                с оставащо количество
                за зачисляване.
            </div>
        `;

        return;
    }


    list.innerHTML =
        orders
            .map(
                renderOrderCard
            )
            .join("");
}


function updateAssignmentLimit(
    orderId: string
): void {

    const order =
        getOrder(orderId);

    const select =
        document.getElementById(
            `k3OrderTruck-${orderId}`
        ) as HTMLSelectElement | null;

    const input =
        document.getElementById(
            `k3OrderTons-${orderId}`
        ) as HTMLInputElement | null;

    const message =
        document.getElementById(
            `k3OrderCapacity-${orderId}`
        );


    if (
        !order ||
        !select ||
        !input ||
        !message
    ) {
        return;
    }


    if (!select.value) {

        input.max =
            String(
                order.remainingTons
            );

        message.textContent =
            "Избери готова композиция.";

        return;
    }


    const composition =
        getComposition(
            select.value
        );


    if (!composition) {

        message.textContent =
            "Композицията вече не е налична.";

        return;
    }


    const allowed =
        Math.min(
            order.remainingTons,
            composition.freeTons
        );


    input.max =
        String(allowed);


    const current =
        Number(
            input.value
        );


    if (
        !Number.isFinite(current) ||
        current <= 0 ||
        current > allowed
    ) {
        input.value =
            allowed > 0
                ? String(allowed)
                : "";
    }


    message.textContent =
        `Свободни ${formatTons(
            composition.freeTons
        )} т. • Максимум за тази заявка ${formatTons(
            allowed
        )} т.`;
}


async function submitAssignment(
    button: HTMLButtonElement
): Promise<void> {

    const orderId =
        button.dataset.orderId;


    if (!orderId) {
        return;
    }


    const order =
        getOrder(orderId);

    const select =
        document.getElementById(
            `k3OrderTruck-${orderId}`
        ) as HTMLSelectElement | null;

    const input =
        document.getElementById(
            `k3OrderTons-${orderId}`
        ) as HTMLInputElement | null;


    if (
        !order ||
        !select ||
        !input
    ) {
        return;
    }


    const truckId =
        select.value;

    const tons =
        Number(
            input.value
        );


    if (!truckId) {

        setPageMessage(
            "Избери камион.",
            "error"
        );

        return;
    }


    const composition =
        getComposition(
            truckId
        );


    if (!composition) {

        setPageMessage(
            "Композицията вече не е налична.",
            "error"
        );

        return;
    }


    const allowed =
        Math.min(
            order.remainingTons,
            composition.freeTons
        );


    if (
        !Number.isFinite(tons) ||
        tons <= 0
    ) {

        setPageMessage(
            "Въведи валиден тонаж.",
            "error"
        );

        return;
    }


    if (
        tons > allowed
    ) {

        setPageMessage(
            `Може да зачислиш максимум ${formatTons(
                allowed
            )} т.`,
            "error"
        );

        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Зачисляване...";


    try {

        await assignOrderLoad(
            orderId,
            truckId,
            tons
        );


        await refreshPage();


        setPageMessage(
            `✅ ${formatTons(
                tons
            )} т. от ${
                order.companyName ||
                "заявката"
            } са зачислени към ${
                composition.truckNumber
            }.`,
            "success"
        );


    } catch (error) {

        setPageMessage(
            errorMessage(error),
            "error"
        );


        button.disabled =
            false;

        button.textContent =
            "🚛 Зачисли";
    }
}


function renderCompanies():
string {

    if (!clients) {
        return "";
    }


    if (
        clients.companies.length ===
        0
    ) {
        return `
            <div
                class="orders-empty"
            >
                Все още няма създадени
                клиентски фирми.
            </div>
        `;
    }


    return clients.companies
        .map(
            company => {

                const sites =
                    clients?.sites.filter(
                        site =>
                            site.companyId ===
                            company.id
                    ) || [];


                const accounts =
                    clients?.accounts.filter(
                        account =>
                            account.companyId ===
                            company.id
                    ) || [];


                return `
                    <article
                        class="client-company-card"
                    >

                        <header
                            class="client-company-header"
                        >

                            <div>
                                <strong>
                                    🏢
                                    ${escapeHtml(
                                        company.companyName
                                    )}
                                </strong>

                                ${
                                    company.contactPerson

                                        ? `
                                            <span>
                                                👤
                                                ${escapeHtml(
                                                    company.contactPerson
                                                )}
                                            </span>
                                        `

                                        : ""
                                }

                                ${
                                    company.phone

                                        ? `
                                            <span>
                                                📞
                                                ${escapeHtml(
                                                    company.phone
                                                )}
                                            </span>
                                        `

                                        : ""
                                }
                            </div>


                            <span
                                class="client-active-badge"
                            >
                                ● Активна
                            </span>

                        </header>


                        <div
                            class="client-company-columns"
                        >

                            <div>
                                <h5>
                                    📍 Обекти
                                    (${sites.length})
                                </h5>

                                ${
                                    sites.length

                                        ? sites
                                            .map(
                                                site => `
                                                    <div
                                                        class="client-directory-item"
                                                    >
                                                        <strong>
                                                            ${escapeHtml(
                                                                site.siteName
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ${escapeHtml(
                                                                site.address
                                                            )}
                                                        </span>

                                                        ${
                                                            site.phone

                                                                ? `
                                                                    <small>
                                                                        📞
                                                                        ${escapeHtml(
                                                                            site.phone
                                                                        )}
                                                                    </small>
                                                                `

                                                                : ""
                                                        }
                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <div
                                                class="client-directory-empty"
                                            >
                                                Няма обекти
                                            </div>
                                        `
                                }
                            </div>


                            <div>
                                <h5>
                                    👤 Акаунти
                                    (${accounts.length})
                                </h5>

                                ${
                                    accounts.length

                                        ? accounts
                                            .map(
                                                account => `
                                                    <div
                                                        class="client-directory-item"
                                                    >
                                                        <strong>
                                                            ${escapeHtml(
                                                                account.displayName
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ID:
                                                            ${escapeHtml(
                                                                account.loginId
                                                            )}
                                                        </span>

                                                        ${
                                                            account.phone

                                                                ? `
                                                                    <small>
                                                                        📞
                                                                        ${escapeHtml(
                                                                            account.phone
                                                                        )}
                                                                    </small>
                                                                `

                                                                : ""
                                                        }
                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <div
                                                class="client-directory-empty"
                                            >
                                                Няма акаунти
                                            </div>
                                        `
                                }
                            </div>

                        </div>

                    </article>
                `;
            }
        )
        .join("");
}


function renderClientManagement():
void {

    if (!clients) {
        return;
    }


    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientManagement"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <section
            class="client-directory"
        >

            <header
                class="client-directory-header"
            >
                <h4>
                    📋 Клиентска структура
                </h4>

                <span>
                    ${clients.companies.length}
                    фирми
                </span>
            </header>


            <div
                class="client-company-list"
            >
                ${renderCompanies()}
            </div>

        </section>
    `;
}


async function refreshPage():
Promise<void> {

    const version =
        ++refreshVersion;


    setPageMessage(
        "",
        null
    );


    try {

        const [
            clientSnapshot,
            orderWorkspace
        ] =
            await Promise.all([
                loadClientManagementSnapshot(),
                loadAdminOrdersWorkspace()
            ]);


        if (
            version !==
                refreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        clients =
            clientSnapshot;

        orders =
            orderWorkspace.orders;

        compositions =
            orderWorkspace.compositions;


        renderOrders();

        renderClientManagement();


    } catch (error) {

        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        setPageMessage(
            errorMessage(error),
            "error"
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
            "[data-orders-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset.ordersAction;


    if (
        action ===
        "assign-load"
    ) {

        await submitAssignment(
            button
        );
    }
}


function handleChange(
    event: Event
): void {

    const target =
        event.target;


    if (
        !(target instanceof
            HTMLSelectElement)
    ) {
        return;
    }


    const orderId =
        target.dataset
            .orderTruckSelect;


    if (orderId) {

        updateAssignmentLimit(
            orderId
        );
    }
}


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
        "change",
        handleChange
    );


    await refreshPage();
}
