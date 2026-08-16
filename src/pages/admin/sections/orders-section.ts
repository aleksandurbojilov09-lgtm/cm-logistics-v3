import "./orders-section.css";
import "./orders-assignment.css";
import "./orders-map.css";

import {
    loadClientManagementSnapshot,
    type ClientManagementSnapshot
} from "../../../features/clients/client-service";

import {
    assignOrderLoad,
    cancelOrderAssignment,
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


                    <button
                        type="button"
                        class="
                            orders-dispatch-filter
                            orders-addresses-open-button
                        "
                        data-orders-action="open-addresses"
                    >
                        📍 Адреси

                        <span
                            id="k3VisibleOrdersCount"
                            class="orders-addresses-count"
                        >
                            0
                        </span>
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

                        <section
                            id="k3SelectedTruckRoute"
                            class="orders-truck-route"
                            hidden
                        ></section>


                        <div
                            id="k3SelectedOrder"
                            class="orders-selected-order"
                        ></div>




                    </aside>

                </div>

            </section>


            <dialog
                id="k3AddressesDialog"
                class="orders-address-dialog"
            >
                <div
                    class="orders-address-dialog-shell"
                >
                    <header
                        class="orders-address-dialog-header"
                    >
                        <div>
                            <span>
                                Заявки на картата
                            </span>

                            <strong>
                                📍 Адреси
                            </strong>
                        </div>


                        <button
                            type="button"
                            class="orders-address-dialog-close"
                            data-orders-action="close-addresses"
                            aria-label="Затвори адресите"
                        >
                            ✕
                        </button>
                    </header>


                    <div
                        class="orders-address-dialog-help"
                    >
                        Натисни адрес, за да отвориш заявката.
                    </div>


                    <div
                        id="k3ActiveOrdersList"
                        class="
                            orders-compact-list
                            orders-address-dialog-list
                        "
                    >
                        <div
                            class="orders-loading"
                        >
                            Зареждане...
                        </div>
                    </div>
                </div>
            </dialog>


            <dialog
                id="k3QuickAssignDialog"
                class="orders-quick-assign-dialog"
            >
                <form
                    id="k3QuickAssignForm"
                    class="orders-quick-assign-form"
                >
                    <header
                        class="orders-quick-assign-header"
                    >
                        <div>
                            <span>
                                Бързо зачисляване
                            </span>

                            <strong
                                id="k3QuickAssignCompany"
                            >
                                -
                            </strong>
                        </div>

                        <button
                            type="button"
                            class="orders-quick-assign-close"
                            data-orders-action="close-quick-assign"
                            aria-label="Затвори"
                        >
                            ✕
                        </button>
                    </header>


                    <div
                        id="k3QuickAssignSite"
                        class="orders-quick-assign-site"
                    >
                        -
                    </div>


                    <div
                        class="orders-quick-assign-stats"
                    >
                        <div>
                            <span>
                                🚛 Камион
                            </span>

                            <strong
                                id="k3QuickAssignTruck"
                            >
                                -
                            </strong>
                        </div>

                        <div>
                            <span>
                                Остатък заявка
                            </span>

                            <strong
                                id="k3QuickAssignRemaining"
                            >
                                0 т.
                            </strong>
                        </div>

                        <div>
                            <span>
                                Свободни в камиона
                            </span>

                            <strong
                                id="k3QuickAssignFree"
                            >
                                0 т.
                            </strong>
                        </div>

                        <div>
                            <span>
                                Максимум сега
                            </span>

                            <strong
                                id="k3QuickAssignMax"
                            >
                                0 т.
                            </strong>
                        </div>
                    </div>


                    <label
                        class="orders-quick-assign-field"
                    >
                        <span>
                            Колко тона да зачисля?
                        </span>

                        <input
                            id="k3QuickAssignTons"
                            type="number"
                            min="0.001"
                            step="0.001"
                            inputmode="decimal"
                            required
                        />
                    </label>


                    <button
                        type="submit"
                        class="orders-quick-assign-submit"
                    >
                        ➕ Зачисли
                    </button>
                </form>
            </dialog>


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



type OperationalTruckOption = {
    truckId: string;

    truckNumber: string;
    driverName: string;

    activeAssignedTons: number;

    composition:
        ReadyOrderComposition | null;
};


function operationalTruckOptions():
OperationalTruckOption[] {

    const result =
        new Map<
            string,
            OperationalTruckOption
        >();


    for (
        const composition
        of compositions
    ) {

        result.set(
            composition.truckId,
            {
                truckId:
                    composition.truckId,

                truckNumber:
                    composition.truckNumber,

                driverName:
                    composition.driverName,

                activeAssignedTons:
                    composition.currentLoadTons,

                composition
            }
        );
    }


    for (
        const order
        of mapOrders
    ) {

        for (
            const assignment
            of currentOrderAssignments(
                order
            )
        ) {

            if (
                !assignment.truckId
            ) {
                continue;
            }


            const existing =
                result.get(
                    assignment.truckId
                );


            if (existing) {

                if (
                    !existing.composition
                ) {
                    existing.activeAssignedTons +=
                        assignment.assignedTons;
                }

                continue;
            }


            result.set(
                assignment.truckId,
                {
                    truckId:
                        assignment.truckId,

                    truckNumber:
                        assignment.truckNumber ||
                        "Камион",

                    driverName:
                        assignment.driverName ||
                        "-",

                    activeAssignedTons:
                        assignment.assignedTons,

                    composition:
                        null
                }
            );
        }
    }


    return Array
        .from(
            result.values()
        )
        .sort(
            (
                first,
                second
            ) =>
                first.truckNumber.localeCompare(
                    second.truckNumber,
                    "bg"
                )
        );
}


function selectedOperationalTruck():
OperationalTruckOption | null {

    if (!selectedTruckId) {
        return null;
    }


    return (
        operationalTruckOptions()
            .find(
                truck =>
                    truck.truckId ===
                    selectedTruckId
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


type SelectedTruckRouteItem = {
    order:
        AdminOrderListItem;

    assignment:
        AdminOrderAssignment;

    sequence:
        number;
};


function selectedTruckRouteItems():
SelectedTruckRouteItem[] {

    if (!selectedTruckId) {
        return [];
    }


    const items:
        Array<{
            order:
                AdminOrderListItem;

            assignment:
                AdminOrderAssignment;
        }> =
        [];


    for (
        const order
        of mapOrders
    ) {

        for (
            const assignment
            of currentOrderAssignments(
                order
            )
        ) {

            if (
                assignment.truckId !==
                selectedTruckId
            ) {
                continue;
            }


            items.push({
                order,
                assignment
            });
        }
    }


    /*
     * Същият operational ред,
     * използван от бизнес правилото:
     *
     * 1. loading ramp
     * 2. assigned_at
     * 3. assignment id
     *
     * Не обединяваме assignment-и —
     * един assignment = една спирка.
     */
    items.sort(
        (
            first,
            second
        ) => {

            if (
                first.order.loadingRamp !==
                second.order.loadingRamp
            ) {

                return first.order.loadingRamp
                    ? -1
                    : 1;
            }


            const firstTime =
                Date.parse(
                    first.assignment
                        .assignedAt
                ) || 0;

            const secondTime =
                Date.parse(
                    second.assignment
                        .assignedAt
                ) || 0;


            if (
                firstTime !==
                secondTime
            ) {

                return (
                    firstTime -
                    secondTime
                );
            }


            return first.assignment.id
                .localeCompare(
                    second.assignment.id
                );
        }
    );


    return items.map(
        (
            item,
            index
        ) => ({
            ...item,

            sequence:
                index + 1
        })
    );
}


function selectedTruckRouteNumbers():
Record<string, string> {

    const numbers =
        new Map<
            string,
            number[]
        >();


    for (
        const item
        of selectedTruckRouteItems()
    ) {

        const current =
            numbers.get(
                item.order.id
            ) || [];


        current.push(
            item.sequence
        );


        numbers.set(
            item.order.id,
            current
        );
    }


    return Object.fromEntries(
        Array.from(
            numbers.entries()
        ).map(
            (
                [
                    orderId,
                    values
                ]
            ) => [
                orderId,

                values.join(
                    "·"
                )
            ]
        )
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


    const truckOptions =
        operationalTruckOptions();


    select.innerHTML = `
        <option value="">
            -- Избери камион --
        </option>

        ${
            truckOptions
                .map(
                    truck => {

                        if (
                            truck.composition
                        ) {

                            return `
                                <option
                                    value="${escapeHtml(
                                        truck.truckId
                                    )}"
                                >
                                    ${escapeHtml(
                                        truck.truckNumber
                                    )}
                                    —
                                    ${escapeHtml(
                                        truck.driverName
                                    )}
                                    —
                                    ${escapeHtml(
                                        formatTons(
                                            truck.composition
                                                .currentLoadTons
                                        )
                                    )}/24 т.
                                    —
                                    свободни
                                    ${escapeHtml(
                                        formatTons(
                                            truck.composition
                                                .freeTons
                                        )
                                    )}
                                    т.
                                </option>
                            `;
                        }


                        return `
                            <option
                                value="${escapeHtml(
                                    truck.truckId
                                )}"
                            >
                                ${escapeHtml(
                                    truck.truckNumber
                                )}
                                —
                                ${escapeHtml(
                                    truck.driverName
                                )}
                                —
                                зачислени
                                ${escapeHtml(
                                    formatTons(
                                        truck.activeAssignedTons
                                    )
                                )}
                                т.
                                —
                                само преглед
                            </option>
                        `;
                    }
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


function renderSelectedTruckRoute():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3SelectedTruckRoute"
        );


    if (!container) {
        return;
    }


    const truck =
        selectedOperationalTruck();


    if (!truck) {

        container.hidden =
            true;

        container.innerHTML =
            "";

        return;
    }


    const composition =
        selectedComposition();


    const route =
        selectedTruckRouteItems();


    const currentLoad =
        truck.activeAssignedTons;


    const freeTons =
        composition
            ? composition.freeTons
            : Math.max(
                24 -
                currentLoad,
                0
            );


    const loadPercent =
        Math.min(
            Math.max(
                (
                    currentLoad /
                    24
                ) * 100,
                0
            ),
            100
        );


    container.hidden =
        false;


    container.innerHTML = `
        <header
            class="orders-truck-route-header"
        >
            <div
                class="orders-truck-route-title"
            >
                <span>
                    🚛 Маршрут
                    (${route.length})
                </span>

                <strong>
                    ${escapeHtml(
                        truck.truckNumber
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        truck.driverName ||
                        "-"
                    )}
                </small>
            </div>


            <div
                class="orders-truck-route-capacity"
            >
                <strong>
                    ${escapeHtml(
                        formatTons(
                            currentLoad
                        )
                    )}
                    / 24 т.
                </strong>

                <span>
                    свободни
                    ${escapeHtml(
                        formatTons(
                            freeTons
                        )
                    )}
                    т.
                </span>
            </div>
        </header>


        <div
            class="orders-truck-route-progress"
            aria-hidden="true"
        >
            <span
                style="width: ${loadPercent}%"
            ></span>
        </div>


        ${
            route.length

                ? `
                    <div
                        class="orders-truck-route-list"
                    >
                        ${route
                            .map(
                                item => {

                                    const canCancel =
                                        item.assignment
                                            .status ===
                                            "assigned" &&
                                        !item.assignment
                                            .tripId;


                                    return `
                                        <div
                                            class="
                                                orders-truck-route-row
                                                ${
                                                    item.order
                                                        .loadingRamp

                                                        ? "orders-truck-route-row-ramp"

                                                        : ""
                                                }
                                            "
                                        >
                                            <button
                                                type="button"
                                                class="orders-truck-route-select"
                                                data-orders-action="select-order"
                                                data-order-id="${escapeHtml(
                                                    item.order.id
                                                )}"
                                            >
                                                <span
                                                    class="orders-truck-route-number"
                                                >
                                                    ${item.sequence}
                                                </span>


                                                <span
                                                    class="orders-truck-route-main"
                                                >
                                                    <strong>
                                                        ${escapeHtml(
                                                            item.order
                                                                .companyName
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${
                                                            item.order
                                                                .loadingRamp

                                                                ? "🚪 РАМПА · "
                                                                : ""
                                                        }

                                                        ${escapeHtml(
                                                            item.order
                                                                .siteName
                                                        )}
                                                    </small>
                                                </span>


                                                <strong
                                                    class="orders-truck-route-tons"
                                                >
                                                    ${escapeHtml(
                                                        formatTons(
                                                            item.assignment
                                                                .assignedTons
                                                        )
                                                    )}
                                                    т.
                                                </strong>
                                            </button>


                                            ${
                                                canCancel

                                                    ? `
                                                        <button
                                                            type="button"
                                                            class="orders-truck-route-cancel"
                                                            data-orders-action="cancel-route-assignment"
                                                            data-order-id="${escapeHtml(
                                                                item.order.id
                                                            )}"
                                                            data-assignment-id="${escapeHtml(
                                                                item.assignment.id
                                                            )}"
                                                            title="Отмени зачисляването"
                                                            aria-label="Отмени зачисляването"
                                                        >
                                                            ↩
                                                        </button>
                                                    `

                                                    : ""
                                            }
                                        </div>
                                    `;
                                }
                            )
                            .join("")}
                    </div>
                `

                : `
                    <div
                        class="orders-truck-route-empty"
                    >
                        Все още няма зачислени
                        адреси за този камион.
                    </div>
                `
        }
    `;
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


    const selectedTruck =
        selectedOperationalTruck();


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

    const historyAssignments =
        order.assignments;


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

            ${
                order.loadingRamp

                    ? `
                        <span
                            class="orders-ramp-badge"
                        >
                            🚪 РАМПА
                            ·
                            ПЪРВА СПИРКА
                        </span>
                    `

                    : ""
            }
        </div>


        <details
            class="orders-selected-details"
        >
            <summary>
                <span>
                    📊 Подробности
                </span>

                <small>
                    ${escapeHtml(
                        formatTons(
                            order.requestedTons
                        )
                    )}
                    т. заявени
                    ·
                    ${escapeHtml(
                        formatTons(
                            order.completedTons
                        )
                    )}
                    т. изпълнени
                </small>
            </summary>


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
                    Изпълнени
                </span>

                <strong>
                    ${escapeHtml(
                        formatTons(
                            order.completedTons
                        )
                    )}
                    т.
                </strong>
            </div>

            <div
                class="orders-selected-stat"
            >
                <span>
                    Зачислени сега
                </span>

                <strong>
                    ${escapeHtml(
                        formatTons(
                            order.activeAssignedTons
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
        </details>


        ${
            assignments.length

                ? `
                    <div
                        class="orders-current-assignments"
                    >
                        <strong
                            class="orders-current-assignments-title"
                        >
                            🚛 Текущо зачисляване
                        </strong>

                        ${
                            assignments
                                .map(
                                    assignment => `
                                        <div
                                            class="orders-current-assignment"
                                        >
                                            <div
                                                class="orders-current-assignment-info"
                                            >
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

                                            <strong
                                                class="orders-current-assignment-tons"
                                            >
                                                ${escapeHtml(
                                                    formatTons(
                                                        assignment.assignedTons
                                                    )
                                                )}
                                                т.
                                            </strong>

                                            ${
                                                assignment.status ===
                                                    "assigned" &&
                                                !assignment.tripId

                                                    ? `
                                                        <button
                                                            type="button"
                                                            class="orders-cancel-assignment-button"
                                                            data-orders-action="cancel-assignment"
                                                            data-assignment-id="${escapeHtml(
                                                                assignment.id
                                                            )}"
                                                        >
                                                            ↩ Отмени
                                                        </button>
                                                    `

                                                    : `
                                                        <span
                                                            class="orders-current-assignment-locked"
                                                        >
                                                            Курсът е започнал
                                                        </span>
                                                    `
                                            }
                                        </div>
                                    `
                                )
                                .join("")
                        }
                    </div>
                `

                : ""
        }


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

                                : selectedTruck

                                    ? `
                                        🚛
                                        ${escapeHtml(
                                            selectedTruck.truckNumber
                                        )}
                                        е избран за преглед,
                                        но в момента не е
                                        наличен за ново
                                        зачисляване.
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
            historyAssignments.length

                ? `
                    <details
                        class="orders-selected-history"
                    >
                        <summary>
                            🕘 История
                            (${historyAssignments.length})
                        </summary>

                        <div
                            class="orders-selected-history-list"
                        >
                            ${historyAssignments
                                .map(
                                    assignment => `
                                        <div
                                            class="
                                                orders-selected-history-row
                                                ${
                                                    assignment.status ===
                                                        "cancelled"

                                                        ? "orders-selected-history-row-cancelled"

                                                        : ""
                                                }
                                            "
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

                                                ${
                                                    assignment.status ===
                                                        "cancelled"

                                                        ? `
                                                            <small
                                                                class="orders-assignment-cancelled-label"
                                                            >
                                                                ↩ Отменено
                                                            </small>
                                                        `

                                                        : ""
                                                }
                                            </div>

                                            <div
                                                class="orders-selected-history-actions"
                                            >
                                                <strong>
                                                    ${escapeHtml(
                                                        formatTons(
                                                            assignment.assignedTons
                                                        )
                                                    )}
                                                    т.
                                                </strong>

                                                ${
                                                    assignment.status ===
                                                        "assigned" &&
                                                    !assignment.tripId

                                                        ? `
                                                            <small
                                                                class="orders-assignment-current-label"
                                                            >
                                                                Текущо
                                                            </small>
                                                        `

                                                        : ""
                                                }
                                            </div>
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

                                ${
                                    order.loadingRamp

                                        ? `
                                            <small
                                                class="orders-compact-ramp"
                                            >
                                                🚪 РАМПА
                                                ·
                                                ПЪРВА СПИРКА
                                            </small>
                                        `

                                        : ""
                                }

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


    const route =
        selectedTruckRouteItems();


    /*
     * Маршрутът на избрания камион
     * остава видим на картата,
     * дори ако текущият филтър
     * скрива вече напълно
     * зачислена заявка.
     */
    const mapVisible =
        [...visible];


    const visibleIds =
        new Set(
            mapVisible.map(
                order =>
                    order.id
            )
        );


    for (
        const item
        of route
    ) {

        if (
            visibleIds.has(
                item.order.id
            )
        ) {
            continue;
        }


        mapVisible.push(
            item.order
        );


        visibleIds.add(
            item.order.id
        );
    }


    const composition =
        selectedComposition();


    const selectedTruck =
        selectedOperationalTruck();


    await renderAdminOrdersMap(
        mapVisible,
        fixedLocations,
        {
            selectedOrderId,
            selectedTruckId,

            selectedTruckNumber:
                selectedTruck
                    ?.truckNumber ||
                null,

            selectedTruckFreeTons:
                composition
                    ?.freeTons ??
                null,

            selectedTruckRouteNumbers:
                selectedTruckRouteNumbers(),

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

    renderSelectedTruckRoute();

    renderCompactOrders();

    await renderDispatchMap();
}


function openAddressesDialog():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3AddressesDialog"
        );


    if (
        dialog &&
        !dialog.open
    ) {
        dialog.showModal();
    }
}


function closeAddressesDialog():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3AddressesDialog"
        );


    if (
        dialog?.open
    ) {
        dialog.close();
    }
}


function closeQuickAssignDialog():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3QuickAssignDialog"
        );


    if (
        dialog?.open
    ) {
        dialog.close();
    }
}


function openQuickAssignDialog(
    orderId: string
): void {

    const order =
        getOperationalOrder(
            orderId
        );


    const composition =
        selectedComposition();


    const selectedTruck =
        selectedOperationalTruck();


    if (
        !order ||
        !composition ||
        !selectedTruck
    ) {

        setPageMessage(
            "Първо избери активен камион, наличен за зачисляване.",
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
        allowed <= 0
    ) {

        setPageMessage(
            composition.freeTons <= 0
                ? `${composition.truckNumber} няма свободен капацитет.`
                : "По заявката няма оставащи тонове за зачисляване.",
            "error"
        );

        return;
    }


    selectedOrderId =
        order.id;

    renderCompactOrders();


    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3QuickAssignDialog"
        );

    const form =
        document.querySelector<
            HTMLFormElement
        >(
            "#k3QuickAssignForm"
        );

    const company =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignCompany"
        );

    const site =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignSite"
        );

    const truck =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignTruck"
        );

    const remaining =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignRemaining"
        );

    const free =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignFree"
        );

    const max =
        document.querySelector<
            HTMLElement
        >(
            "#k3QuickAssignMax"
        );

    const input =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3QuickAssignTons"
        );


    if (
        !dialog ||
        !form ||
        !company ||
        !site ||
        !truck ||
        !remaining ||
        !free ||
        !max ||
        !input
    ) {

        setPageMessage(
            "Формата за бързо зачисляване не е налична.",
            "error"
        );

        return;
    }


    form.dataset.orderId =
        order.id;

    company.textContent =
        order.companyName;

    site.textContent =
        `📍 ${order.siteName} — ${order.siteAddress}`;

    truck.textContent =
        composition.truckNumber;

    remaining.textContent =
        `${formatTons(
            order.remainingTons
        )} т.`;

    free.textContent =
        `${formatTons(
            composition.freeTons
        )} т.`;

    max.textContent =
        `${formatTons(
            allowed
        )} т.`;

    input.max =
        String(
            allowed
        );

    input.value =
        formatTons(
            allowed
        );


    if (
        !dialog.open
    ) {
        dialog.showModal();
    }


    window.setTimeout(
        () => {
            input.focus();
            input.select();
        },
        0
    );
}


async function performAssignment(
    orderId: string,
    tons: number,
    button:
        HTMLButtonElement,
    idleButtonText: string
): Promise<boolean> {

    const order =
        getOperationalOrder(
            orderId
        );

    const composition =
        selectedComposition();


    if (
        !order ||
        !composition
    ) {

        setPageMessage(
            "Избери заявка и активен камион.",
            "error"
        );

        return false;
    }


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

        return false;
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

        return false;
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


        return true;

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
            idleButtonText;


        return false;
    }
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

    const input =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3SelectedOrderTons"
        );


    if (
        !order ||
        !input
    ) {

        setPageMessage(
            "Избери заявка и камион.",
            "error"
        );

        return;
    }


    await performAssignment(
        order.id,
        Number(
            input.value
        ),
        button,
        "🚛 Зачисли"
    );
}


async function cancelSelectedAssignment(
    button:
        HTMLButtonElement
): Promise<void> {

    const assignmentId =
        button.dataset
            .assignmentId ||
        "";


    const order =
        selectedOrderId
            ? getOperationalOrder(
                selectedOrderId
            )
            : null;


    const assignment =
        order
            ?.assignments
            .find(
                item =>
                    item.id ===
                    assignmentId
            ) ||
        null;


    if (
        !order ||
        !assignment
    ) {

        setPageMessage(
            "Зачисляването не е намерено.",
            "error"
        );

        return;
    }


    if (
        assignment.status !==
            "assigned" ||
        assignment.tripId
    ) {

        setPageMessage(
            "Зачисляването може да бъде отменено само преди стартиране на курса.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Да върна ли ${formatTons(
                assignment.assignedTons
            )} т. от ${assignment.truckNumber || "камиона"} обратно към заявката на ${order.companyName}?`
        );


    if (!confirmed) {
        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Отмяна...";


    try {

        await cancelOrderAssignment(
            assignment.id
        );


        await refreshPage();


        setPageMessage(
            `↩ ${formatTons(
                assignment.assignedTons
            )} т. са върнати към заявката на ${order.companyName}.`,
            "success"
        );

    } catch (error) {

        setPageMessage(
            errorMessage(
                error
            ),
            "error"
        );


        if (
            button.isConnected
        ) {

            button.disabled =
                false;

            button.textContent =
                "↩ Отмени";
        }
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

        mapOrders =
            orderWorkspace.mapOrders;

        fixedLocations =
            locationSnapshot;

        compositions =
            orderWorkspace.compositions;


        if (
            selectedTruckId &&
            !operationalTruckOptions()
                .some(
                    truck =>
                        truck.truckId ===
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

            closeAddressesDialog();

            await renderDispatchMap();
        }

        return;
    }


    if (
        action ===
        "open-addresses"
    ) {

        openAddressesDialog();

        return;
    }


    if (
        action ===
        "close-addresses"
    ) {

        closeAddressesDialog();

        return;
    }


    if (
        action ===
        "quick-assign"
    ) {

        const orderId =
            button.dataset
                .orderId;


        if (orderId) {

            openQuickAssignDialog(
                orderId
            );
        }

        return;
    }


    if (
        action ===
        "close-quick-assign"
    ) {

        closeQuickAssignDialog();

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
        "cancel-route-assignment"
    ) {

        const orderId =
            button.dataset
                .orderId;


        if (orderId) {

            selectedOrderId =
                orderId;

            renderCompactOrders();
        }


        await cancelSelectedAssignment(
            button
        );

        return;
    }


    if (
        action ===
        "cancel-assignment"
    ) {

        await cancelSelectedAssignment(
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


async function handleSubmit(
    event: SubmitEvent
): Promise<void> {

    const form =
        event.target;


    if (
        !(
            form instanceof
            HTMLFormElement
        ) ||
        form.id !==
            "k3QuickAssignForm"
    ) {
        return;
    }


    event.preventDefault();


    const orderId =
        form.dataset
            .orderId ||
        "";

    const input =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3QuickAssignTons"
        );

    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            ".orders-quick-assign-submit"
        );


    if (
        !orderId ||
        !input ||
        !button
    ) {

        setPageMessage(
            "Бързото зачисляване не е готово.",
            "error"
        );

        return;
    }


    const success =
        await performAssignment(
            orderId,
            Number(
                input.value
            ),
            button,
            "➕ Зачисли"
        );


    if (success) {

        closeQuickAssignDialog();
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


    root.addEventListener(
        "input",
        handleInput
    );


    root.addEventListener(
        "submit",
        event => {

            void handleSubmit(
                event
            );
        }
    );


    await refreshPage();
}
