import "./orders-section.css";
import "./orders-assignment.css";
import "./orders-map.css";

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
    type FixedLocation
} from "../../../entities/location/fixed-location";

import {
    loadFixedLocations
} from "../../../entities/location/fixed-location-service";

import {
    renderAdminOrdersMap
} from "./orders-map";

import {
    escapeHtml
} from "../../../shared/lib/html";


let clients:
    ClientManagementSnapshot | null =
    null;

let orders:
    AdminOrderListItem[] =
    [];

let mapOrders:
    AdminOrderListItem[] =
    [];

let fixedLocations:
    FixedLocation[] =
    [];

let compositions:
    ReadyOrderComposition[] =
    [];

let refreshVersion =
    0;

let selectedTruckId:
    string | null =
    null;

let selectedOrderId:
    string | null =
    null;

let orderSearch =
    "";

let orderFilter:
    "all" |
    "assignable" |
    "selected-truck" =
    "assignable";


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
                class="
                    orders-panel
                    orders-dispatch-panel
                "
            >

                <header
                    class="orders-panel-header"
                >

                    <div>
                        <h3>
                            🗺 Разпределяне на заявки
                        </h3>

                        <p>
                            Избери камион веднъж,
                            после избирай адреси
                            от картата или списъка.
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
                    class="orders-dispatch-toolbar"
                >

                    <label
                        class="orders-dispatch-field"
                    >
                        <span>
                            🚛 Активен камион
                        </span>

                        <select
                            id="k3DispatchTruckSelect"
                        >
                            <option value="">
                                -- Избери камион --
                            </option>
                        </select>
                    </label>


                    <label
                        class="orders-dispatch-field"
                    >
                        <span>
                            🔍 Търси фирма / град / адрес
                        </span>

                        <input
                            id="k3DispatchOrderSearch"
                            type="search"
                            autocomplete="off"
                            placeholder="Напр. София, test1..."
                        />
                    </label>

                </div>


                <div
                    class="orders-dispatch-filters"
                >
                    <button
                        type="button"
                        class="orders-dispatch-filter"
                        data-orders-action="set-filter"
                        data-orders-filter="assignable"
                    >
                        ⚠️ За зачисляване
                    </button>

                    <button
                        type="button"
                        class="orders-dispatch-filter"
                        data-orders-action="set-filter"
                        data-orders-filter="all"
                    >
                        🗺 Всички активни
                    </button>

                    <button
                        id="k3SelectedTruckFilter"
                        type="button"
                        class="orders-dispatch-filter"
                        data-orders-action="set-filter"
                        data-orders-filter="selected-truck"
                    >
                        🚛 Само избрания камион
                    </button>
                </div>


                <div
                    class="orders-dispatch-grid"
                >

                    <div
                        class="orders-dispatch-map-column"
                    >
                        <div
                            id="k3OrdersOperationalMap"
                            class="orders-operational-map"
                        ></div>
                    </div>


                    <aside
                        class="orders-dispatch-sidebar"
                    >

                        <div
                            id="k3SelectedOrder"
                            class="orders-selected-order"
                        ></div>


                        <div
                            class="orders-compact-list-wrap"
                        >

                            <div
                                class="orders-compact-list-header"
                            >
                                <strong>
                                    📍 Адреси
                                </strong>

                                <span
                                    id="k3VisibleOrdersCount"
                                >
                                    0
                                </span>
                            </div>


                            <div
                                id="k3ActiveOrdersList"
                                class="orders-compact-list"
                            >
                                <div
                                    class="orders-loading"
                                >
                                    Зареждане...
                                </div>
                            </div>

                        </div>

                    </aside>

                </div>

            </section>


            <details
                class="
                    orders-panel
                    client-management-panel
                    orders-collapsible-panel
                "
            >

                <summary>
                    <div>
                        <h3>
                            🏢 Клиенти и обекти
                        </h3>

                        <p>
                            Отвори само когато
                            ти е необходима
                            клиентската структура.
                        </p>
                    </div>
                </summary>


                <div
                    id="k3ClientManagement"
                    class="
                        client-management
                        orders-collapsible-content
                    "
                >
                    <div
                        class="orders-loading"
                    >
                        Зареждане...
                    </div>
                </div>

            </details>

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



function getOperationalOrder(
    orderId: string
): AdminOrderListItem | null {

    return (
        mapOrders.find(
            order =>
                order.id ===
                orderId
        ) ||
        null
    );
}


function selectedComposition():
ReadyOrderComposition | null {

    if (!selectedTruckId) {
        return null;
    }

    return getComposition(
        selectedTruckId
    );
}


function currentOrderAssignments(
    order: AdminOrderListItem
): AdminOrderAssignment[] {

    return order
        .assignments
        .filter(
            assignment =>
                assignment.status !==
                    "cancelled" &&
                assignment.status !==
                    "completed"
        );
}


function selectedTruckHasOrder(
    order: AdminOrderListItem
): boolean {

    if (!selectedTruckId) {
        return false;
    }

    return currentOrderAssignments(
        order
    ).some(
        assignment =>
            assignment.truckId ===
            selectedTruckId
    );
}


function visibleOperationalOrders():
AdminOrderListItem[] {

    const normalizedSearch =
        orderSearch
            .trim()
            .toLocaleLowerCase(
                "bg-BG"
            );


    return mapOrders.filter(
        order => {

            if (
                orderFilter ===
                    "assignable" &&
                order.remainingTons <=
                    0
            ) {
                return false;
            }


            if (
                orderFilter ===
                "selected-truck"
            ) {

                if (
                    !selectedTruckId ||
                    !selectedTruckHasOrder(
                        order
                    )
                ) {
                    return false;
                }
            }


            if (
                !normalizedSearch
            ) {
                return true;
            }


            const haystack =
                [
                    order.companyName,
                    order.siteName,
                    order.siteAddress,
                    order.orderNumber
                ]
                    .join(" ")
                    .toLocaleLowerCase(
                        "bg-BG"
                    );


            return haystack.includes(
                normalizedSearch
            );
        }
    );
}


function renderTruckSelector():
void {

    const select =
        document.querySelector<
            HTMLSelectElement
        >(
            "#k3DispatchTruckSelect"
        );


    if (!select) {
        return;
    }


    const previousValue =
        selectedTruckId ||
        "";


    select.innerHTML = `
        <option value="">
            -- Избери камион --
        </option>

        ${
            compositions
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


    select.value =
        previousValue;


    if (
        select.value !==
        previousValue
    ) {
        selectedTruckId =
            null;
    }


    const selectedTruckFilter =
        document.querySelector<
            HTMLButtonElement
        >(
            "#k3SelectedTruckFilter"
        );


    if (
        selectedTruckFilter
    ) {
        selectedTruckFilter.disabled =
            !selectedTruckId;
    }
}


function renderFilterState():
void {

    const buttons =
        document.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-orders-filter]"
        );


    for (
        const button
        of buttons
    ) {

        button.classList.toggle(
            "orders-dispatch-filter-active",

            button.dataset
                .ordersFilter ===
                orderFilter
        );
    }
}


function renderSelectedOrder():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3SelectedOrder"
        );


    if (!container) {
        return;
    }


    const order =
        selectedOrderId
            ? getOperationalOrder(
                selectedOrderId
            )
            : null;


    if (!order) {

        container.innerHTML = `
            <div
                class="orders-selected-empty"
            >
                👆 Избери адрес от картата
                или от списъка.
            </div>
        `;

        return;
    }


    const composition =
        selectedComposition();


    const allowed =
        composition
            ? Math.min(
                order.remainingTons,
                composition.freeTons
            )
            : 0;


    const assignments =
        currentOrderAssignments(
            order
        );


    const canAssign =
        Boolean(
            composition &&
            allowed > 0
        );


    container.innerHTML = `
        <div
            class="orders-selected-header"
        >
            <div>
                <strong>
                    🏢
                    ${escapeHtml(
                        order.companyName
                    )}
                </strong>

                <span>
                    Заявка
                    #${escapeHtml(
                        order.orderNumber
                    )}
                    ·
                    ${escapeHtml(
                        statusLabel(
                            order.status
                        )
                    )}
                </span>
            </div>

            <span
                class="orders-selected-badge"
            >
                ${escapeHtml(
                    formatTons(
                        order.remainingTons
                    )
                )}
                т. остатък
            </span>
        </div>


        <div
            class="orders-selected-address"
        >
            📍
            <strong>
                ${escapeHtml(
                    order.siteName
                )}
            </strong>
            —
            ${escapeHtml(
                order.siteAddress
            )}
        </div>


        <div
            class="orders-selected-stats"
        >
            <div
                class="orders-selected-stat"
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
                class="orders-selected-stat"
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
                class="orders-selected-stat"
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
            order.remainingTons > 0

                ? `
                    <div
                        class="orders-selected-assignment"
                    >
                        <label>
                            Тонове

                            <input
                                id="k3SelectedOrderTons"
                                type="number"
                                min="0.001"
                                step="0.001"
                                max="${escapeHtml(
                                    String(
                                        allowed ||
                                        order.remainingTons
                                    )
                                )}"
                                value="${
                                    allowed > 0
                                        ? escapeHtml(
                                            formatTons(
                                                allowed
                                            )
                                        )
                                        : ""
                                }"
                                ${
                                    canAssign
                                        ? ""
                                        : "disabled"
                                }
                            />
                        </label>

                        <button
                            type="button"
                            class="orders-selected-assign-button"
                            data-orders-action="assign-selected"
                            ${
                                canAssign
                                    ? ""
                                    : "disabled"
                            }
                        >
                            🚛 Зачисли
                        </button>
                    </div>


                    <div
                        class="orders-selected-capacity"
                    >
                        ${
                            composition

                                ? `
                                    🚛
                                    ${escapeHtml(
                                        composition.truckNumber
                                    )}
                                    · свободни
                                    ${escapeHtml(
                                        formatTons(
                                            composition.freeTons
                                        )
                                    )}
                                    т.
                                    · максимум тук
                                    ${escapeHtml(
                                        formatTons(
                                            allowed
                                        )
                                    )}
                                    т.
                                `

                                : `
                                    Избери камион
                                    от падащото меню горе.
                                `
                        }
                    </div>
                `

                : `
                    <div
                        class="orders-selected-capacity"
                    >
                        ✅ По тази заявка
                        няма оставащ тонаж
                        за зачисляване.
                    </div>
                `
        }


        ${
            assignments.length

                ? `
                    <details
                        class="orders-selected-history"
                    >
                        <summary>
                            🚛 Зачислявания
                            (${assignments.length})
                        </summary>

                        <div
                            class="orders-selected-history-list"
                        >
                            ${assignments
                                .map(
                                    assignment => `
                                        <div
                                            class="orders-selected-history-row"
                                        >
                                            <div>
                                                <strong>
                                                    ${escapeHtml(
                                                        assignment.truckNumber ||
                                                        "Камион"
                                                    )}
                                                </strong>

                                                <span>
                                                    ${escapeHtml(
                                                        assignment.driverName ||
                                                        "-"
                                                    )}
                                                </span>
                                            </div>

                                            <strong>
                                                ${escapeHtml(
                                                    formatTons(
                                                        assignment.assignedTons
                                                    )
                                                )}
                                                т.
                                            </strong>
                                        </div>
                                    `
                                )
                                .join("")}
                        </div>
                    </details>
                `

                : ""
        }
    `;
}


function renderCompactOrders():
void {

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersList"
        );

    const totalCount =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersCount"
        );

    const visibleCount =
        document.querySelector<
            HTMLElement
        >(
            "#k3VisibleOrdersCount"
        );


    if (
        !list ||
        !totalCount ||
        !visibleCount
    ) {
        return;
    }


    const visible =
        visibleOperationalOrders();


    totalCount.textContent =
        String(
            mapOrders.length
        );

    visibleCount.textContent =
        String(
            visible.length
        );


    if (
        selectedOrderId &&
        !mapOrders.some(
            order =>
                order.id ===
                selectedOrderId
        )
    ) {
        selectedOrderId =
            null;
    }


    if (
        visible.length ===
        0
    ) {

        list.innerHTML = `
            <div
                class="orders-compact-empty"
            >
                Няма заявки,
                които отговарят
                на текущия филтър.
            </div>
        `;

        renderSelectedOrder();

        return;
    }


    list.innerHTML =
        visible
            .map(
                order => {

                    const assignments =
                        currentOrderAssignments(
                            order
                        );


                    const trucks =
                        Array.from(
                            new Set(
                                assignments
                                    .map(
                                        assignment =>
                                            assignment
                                                .truckNumber
                                    )
                                    .filter(
                                        Boolean
                                    )
                            )
                        );


                    return `
                        <button
                            type="button"
                            class="
                                orders-compact-item
                                ${
                                    selectedOrderId ===
                                        order.id

                                        ? "orders-compact-item-active"

                                        : ""
                                }
                            "
                            data-orders-action="select-order"
                            data-order-id="${escapeHtml(
                                order.id
                            )}"
                        >
                            <div
                                class="orders-compact-main"
                            >
                                <strong>
                                    ${escapeHtml(
                                        order.companyName
                                    )}
                                </strong>

                                <span>
                                    📍
                                    ${escapeHtml(
                                        order.siteAddress
                                    )}
                                </span>

                                <small>
                                    ${
                                        trucks.length

                                            ? `🚛 ${escapeHtml(
                                                trucks.join(
                                                    ", "
                                                )
                                            )}`

                                            : "⚠️ Няма камион"
                                    }
                                </small>
                            </div>

                            <div
                                class="
                                    orders-compact-tons
                                    ${
                                        order.remainingTons <=
                                            0

                                            ? "orders-compact-tons-zero"

                                            : ""
                                    }
                                "
                            >
                                ${
                                    order.remainingTons >
                                    0

                                        ? `${escapeHtml(
                                            formatTons(
                                                order.remainingTons
                                            )
                                        )} т.`

                                        : "✓"
                                }
                            </div>
                        </button>
                    `;
                }
            )
            .join("");


    renderSelectedOrder();
}


async function renderDispatchMap():
Promise<void> {

    const visible =
        visibleOperationalOrders();


    await renderAdminOrdersMap(
        visible,
        fixedLocations,
        {
            selectedOrderId,
            selectedTruckId,

            onSelectOrder:
                orderId => {

                    selectedOrderId =
                        orderId;

                    renderCompactOrders();
                }
        }
    );
}


async function renderDispatchWorkspace():
Promise<void> {

    renderTruckSelector();

    renderFilterState();

    renderCompactOrders();

    await renderDispatchMap();
}


async function submitSelectedAssignment(
    button:
        HTMLButtonElement
): Promise<void> {

    const order =
        selectedOrderId
            ? getOperationalOrder(
                selectedOrderId
            )
            : null;

    const composition =
        selectedComposition();

    const input =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3SelectedOrderTons"
        );


    if (
        !order ||
        !composition ||
        !input
    ) {

        setPageMessage(
            "Избери заявка и камион.",
            "error"
        );

        return;
    }


    const tons =
        Number(
            input.value
        );


    const allowed =
        Math.min(
            order.remainingTons,
            composition.freeTons
        );


    if (
        !Number.isFinite(
            tons
        ) ||
        tons <= 0
    ) {

        setPageMessage(
            "Въведи валиден тонаж.",
            "error"
        );

        return;
    }


    if (
        tons >
        allowed
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
            order.id,
            composition.truckId,
            tons
        );


        await refreshPage();


        setPageMessage(
            `✅ ${formatTons(
                tons
            )} т. от ${order.companyName} са зачислени към ${composition.truckNumber}.`,
            "success"
        );


    } catch (error) {

        setPageMessage(
            errorMessage(
                error
            ),
            "error"
        );


        button.disabled =
            false;

        button.textContent =
            "🚛 Зачисли";
    }
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


            <button
                type="button"
                class="order-map-focus-button"
                data-orders-map-focus="${escapeHtml(
                    order.id
                )}"
            >
                🗺 Покажи адреса на картата
            </button>


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

    renderCompactOrders();
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
            orderWorkspace,
            locationSnapshot
        ] =
            await Promise.all([
                loadClientManagementSnapshot(),
                loadAdminOrdersWorkspace(),

                loadFixedLocations()
                    .catch(
                        () => []
                    )
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

        mapOrders =
            orderWorkspace.mapOrders;

        fixedLocations =
            locationSnapshot;

        compositions =
            orderWorkspace.compositions;


        if (
            selectedTruckId &&
            !compositions.some(
                composition =>
                    composition.truckId ===
                    selectedTruckId
            )
        ) {
            selectedTruckId =
                null;

            if (
                orderFilter ===
                "selected-truck"
            ) {
                orderFilter =
                    "assignable";
            }
        }


        if (
            selectedOrderId &&
            !mapOrders.some(
                order =>
                    order.id ===
                    selectedOrderId
            )
        ) {
            selectedOrderId =
                null;
        }


        renderClientManagement();

        await renderDispatchWorkspace();


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
        button.dataset
            .ordersAction;


    if (
        action ===
        "select-order"
    ) {

        const orderId =
            button.dataset
                .orderId;


        if (orderId) {

            selectedOrderId =
                orderId;

            renderCompactOrders();

            await renderDispatchMap();
        }

        return;
    }


    if (
        action ===
        "assign-selected"
    ) {

        await submitSelectedAssignment(
            button
        );

        return;
    }


    if (
        action ===
        "set-filter"
    ) {

        const filter =
            button.dataset
                .ordersFilter;


        if (
            filter === "all" ||
            filter === "assignable" ||
            filter === "selected-truck"
        ) {

            if (
                filter ===
                    "selected-truck" &&
                !selectedTruckId
            ) {
                return;
            }


            orderFilter =
                filter;

            await renderDispatchWorkspace();
        }
    }
}


function handleChange(
    event: Event
): void {

    const target =
        event.target;


    if (
        !(
            target instanceof
            HTMLSelectElement
        )
    ) {
        return;
    }


    if (
        target.id ===
        "k3DispatchTruckSelect"
    ) {

        selectedTruckId =
            target.value ||
            null;


        if (
            orderFilter ===
                "selected-truck" &&
            !selectedTruckId
        ) {
            orderFilter =
                "assignable";
        }


        void renderDispatchWorkspace();
    }
}


function handleInput(
    event: Event
): void {

    const target =
        event.target;


    if (
        !(
            target instanceof
            HTMLInputElement
        )
    ) {
        return;
    }


    if (
        target.id !==
        "k3DispatchOrderSearch"
    ) {
        return;
    }


    orderSearch =
        target.value;


    void renderDispatchWorkspace();
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


    root.addEventListener(
        "input",
        handleInput
    );


    await refreshPage();
}
