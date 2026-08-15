import type {
    AdminOrderAssignment,
    AdminOrderListItem
} from "../../../features/orders/admin-orders-service";

import {
    FIXED_LOCATION_CODES,
    type FixedLocation
} from "../../../entities/location/fixed-location";

import {
    escapeHtml
} from "../../../shared/lib/html";

import {
    loadLeaflet,
    type LeafletCoordinate,
    type LeafletLayerGroup,
    type LeafletMap,
    type LeafletNamespace
} from "../../../shared/lib/leaflet-loader";


type OrdersMapFilter =
    | "all"
    | "assignable"
    | `truck:${string}`;


type TruckSummary = {
    truckId: string;
    truckNumber: string;
    driverName: string;

    assignedTons: number;

    orderIds:
        Set<string>;
};


let map:
    LeafletMap | null =
    null;

let leaflet:
    LeafletNamespace | null =
    null;

let layer:
    LeafletLayerGroup | null =
    null;

let currentFilter:
    OrdersMapFilter =
    "all";

let latestOrders:
    AdminOrderListItem[] =
    [];

let latestFixedLocations:
    FixedLocation[] =
    [];


function formatTons(
    value: number
): string {

    if (
        !Number.isFinite(
            value
        )
    ) {
        return "0";
    }

    if (
        Number.isInteger(
            value
        )
    ) {
        return String(
            value
        );
    }

    return value
        .toFixed(3)
        .replace(
            /0+$/,
            ""
        )
        .replace(
            /\.$/,
            ""
        );
}


function orderStatusLabel(
    order: AdminOrderListItem
): string {

    switch (
        order.status
    ) {

        case "pending":
            return "Необработена";

        case "partial":
            return "Частично зачислена";

        case "assigned":
            return "Зачислена";

        case "in_progress":
            return "В курс";

        case "completed":
            return "Приключена";

        case "cancelled":
            return "Отказана";
    }
}


function assignmentStatusLabel(
    assignment:
        AdminOrderAssignment
): string {

    switch (
        assignment.status
    ) {

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


function isCurrentAssignment(
    assignment:
        AdminOrderAssignment
): boolean {

    return (
        assignment.status !==
            "cancelled" &&
        assignment.status !==
            "completed"
    );
}


function currentAssignments(
    order:
        AdminOrderListItem
): AdminOrderAssignment[] {

    return order
        .assignments
        .filter(
            isCurrentAssignment
        );
}


function truckSummaries(
    orders:
        AdminOrderListItem[]
): TruckSummary[] {

    const summaries =
        new Map<
            string,
            TruckSummary
        >();


    for (
        const order
        of orders
    ) {

        for (
            const assignment
            of currentAssignments(
                order
            )
        ) {

            if (
                !assignment.truckId
            ) {
                continue;
            }


            let summary =
                summaries.get(
                    assignment.truckId
                );


            if (!summary) {

                summary = {
                    truckId:
                        assignment.truckId,

                    truckNumber:
                        assignment.truckNumber ||
                        "Камион",

                    driverName:
                        assignment.driverName ||
                        "-",

                    assignedTons:
                        0,

                    orderIds:
                        new Set<string>()
                };


                summaries.set(
                    assignment.truckId,
                    summary
                );
            }


            summary.assignedTons +=
                assignment.assignedTons;


            summary.orderIds.add(
                order.id
            );
        }
    }


    return Array
        .from(
            summaries.values()
        )
        .sort(
            (
                first,
                second
            ) =>
                first
                    .truckNumber
                    .localeCompare(
                        second.truckNumber,
                        "bg"
                    )
        );
}


function truckColorIndex(
    summaries:
        TruckSummary[],

    truckId:
        string
): number {

    const index =
        summaries.findIndex(
            summary =>
                summary.truckId ===
                truckId
        );


    return index >=
        0

        ? index %
            8

        : 7;
}


function truckColorClass(
    summaries:
        TruckSummary[],

    truckId:
        string
): string {

    return (
        `orders-map-color-${
            truckColorIndex(
                summaries,
                truckId
            )
        }`
    );
}


function filterOrders(
    orders:
        AdminOrderListItem[]
): AdminOrderListItem[] {

    if (
        currentFilter ===
        "all"
    ) {
        return orders;
    }


    if (
        currentFilter ===
        "assignable"
    ) {

        return orders.filter(
            order =>
                order.remainingTons >
                0
        );
    }


    const truckId =
        currentFilter.replace(
            "truck:",
            ""
        );


    return orders.filter(
        order =>
            currentAssignments(
                order
            )
                .some(
                    assignment =>
                        assignment
                            .truckId ===
                        truckId
                )
    );
}


function filterButton(
    value: OrdersMapFilter,
    label: string
): string {

    return `
        <button
            type="button"
            class="
                orders-map-filter
                ${
                    currentFilter ===
                        value

                        ? "orders-map-filter-active"

                        : ""
                }
            "
            data-orders-map-filter="${escapeHtml(
                value
            )}"
        >
            ${label}
        </button>
    `;
}


function renderToolbar(
    orders:
        AdminOrderListItem[],

    summaries:
        TruckSummary[]
): void {

    const toolbar =
        document.querySelector<
            HTMLElement
        >(
            "#k3OrdersMapToolbar"
        );


    if (!toolbar) {
        return;
    }


    const assignableCount =
        orders.filter(
            order =>
                order.remainingTons >
                0
        ).length;


    toolbar.innerHTML = `
        ${filterButton(
            "all",
            `🗺 Всички ${orders.length}`
        )}

        ${filterButton(
            "assignable",
            `⚠️ За зачисляване ${assignableCount}`
        )}

        ${
            summaries
                .map(
                    (
                        summary,
                        index
                    ) => `
                        <button
                            type="button"
                            class="
                                orders-map-truck-filter
                                ${
                                    currentFilter ===
                                        `truck:${summary.truckId}`

                                        ? "orders-map-truck-filter-active"

                                        : ""
                                }
                            "
                            data-orders-map-filter="truck:${escapeHtml(
                                summary.truckId
                            )}"
                        >
                            <span
                                class="
                                    orders-map-color-dot
                                    orders-map-color-${
                                        index % 8
                                    }
                                "
                            ></span>

                            <strong>
                                ${escapeHtml(
                                    summary.truckNumber
                                )}
                            </strong>

                            <span>
                                ${summary.orderIds.size}
                                адреса
                                ·
                                ${escapeHtml(
                                    formatTons(
                                        summary.assignedTons
                                    )
                                )}
                                т.
                            </span>
                        </button>
                    `
                )
                .join("")
        }
    `;
}


function orderPinHtml(
    order:
        AdminOrderListItem,

    summaries:
        TruckSummary[]
): string {

    const assignments =
        currentAssignments(
            order
        );


    const truckIds =
        Array.from(
            new Set(
                assignments
                    .map(
                        assignment =>
                            assignment.truckId
                    )
                    .filter(
                        Boolean
                    )
            )
        );


    let className =
        "orders-map-pin-unassigned";

    let mainLabel =
        "ЗА ЗАЧИСЛЯВАНЕ";


    if (
        truckIds.length ===
        1
    ) {

        className =
            truckColorClass(
                summaries,
                truckIds[0]
            );


        mainLabel =
            assignments.find(
                assignment =>
                    assignment.truckId ===
                    truckIds[0]
            )
                ?.truckNumber ||
            "КАМИОН";
    }


    if (
        truckIds.length >
        1
    ) {

        className =
            "orders-map-pin-mixed";

        mainLabel =
            `${truckIds.length} КАМИОНА`;
    }


    let secondLabel =
        `${formatTons(
            order.remainingTons
        )} т. остатък`;


    if (
        order.remainingTons <=
        0
    ) {

        secondLabel =
            order.status ===
                "in_progress"

                ? "В КУРС"

                : "ЗАЧИСЛЕНА";
    }


    return `
        <div
            class="
                orders-map-pin
                ${className}
            "
        >
            <strong>
                ${escapeHtml(
                    mainLabel
                )}
            </strong>

            <span>
                ${escapeHtml(
                    secondLabel
                )}
            </span>
        </div>
    `;
}


function orderPopupHtml(
    order:
        AdminOrderListItem,

    summaries:
        TruckSummary[]
): string {

    const assignments =
        currentAssignments(
            order
        );


    return `
        <div
            class="orders-map-popup"
        >

            <strong
                class="orders-map-popup-title"
            >
                🏢
                ${escapeHtml(
                    order.companyName
                )}
            </strong>


            <div
                class="orders-map-popup-address"
            >
                📍
                <strong>
                    ${escapeHtml(
                        order.siteName
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        order.siteAddress
                    )}
                </span>
            </div>


            <div
                class="orders-map-popup-meta"
            >
                Заявка
                #${escapeHtml(
                    order.orderNumber
                )}

                ·

                ${escapeHtml(
                    orderStatusLabel(
                        order
                    )
                )}
            </div>


            <div
                class="orders-map-popup-tons"
            >
                <span>
                    Заявени
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.requestedTons
                            )
                        )}
                        т.
                    </strong>
                </span>

                <span>
                    Зачислени
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.assignedTons
                            )
                        )}
                        т.
                    </strong>
                </span>

                <span>
                    Остатък
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.remainingTons
                            )
                        )}
                        т.
                    </strong>
                </span>
            </div>


            ${
                assignments.length

                    ? `
                        <div
                            class="orders-map-popup-assignments"
                        >

                            ${assignments
                                .map(
                                    assignment => `
                                        <div
                                            class="orders-map-popup-assignment"
                                        >
                                            <span
                                                class="
                                                    orders-map-color-dot
                                                    ${
                                                        assignment.truckId

                                                            ? truckColorClass(
                                                                summaries,
                                                                assignment.truckId
                                                            )

                                                            : "orders-map-color-7"
                                                    }
                                                "
                                            ></span>

                                            <div>
                                                <strong>
                                                    🚛
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

                                                <small>
                                                    ${escapeHtml(
                                                        formatTons(
                                                            assignment.assignedTons
                                                        )
                                                    )}
                                                    т.
                                                    ·
                                                    ${escapeHtml(
                                                        assignmentStatusLabel(
                                                            assignment
                                                        )
                                                    )}

                                                    ${
                                                        assignment.trailerNumber

                                                            ? `
                                                                ·
                                                                🛻
                                                                ${escapeHtml(
                                                                    assignment.trailerNumber
                                                                )}
                                                            `

                                                            : ""
                                                    }
                                                </small>
                                            </div>
                                        </div>
                                    `
                                )
                                .join("")}

                        </div>
                    `

                    : `
                        <div
                            class="orders-map-popup-unassigned"
                        >
                            ⚠️ Няма текущо зачислен камион.
                        </div>
                    `
            }

        </div>
    `;
}


function addFixedLocations(
    leafletNamespace:
        LeafletNamespace,

    targetLayer:
        LeafletLayerGroup,

    locations:
        FixedLocation[]
): LeafletCoordinate[] {

    const points:
        LeafletCoordinate[] =
        [];


    for (
        const location
        of locations
    ) {

        const coordinates:
            LeafletCoordinate = [
                location.latitude,
                location.longitude
            ];


        const isBase =
            location.code ===
            FIXED_LOCATION_CODES.TRUCK_BASE;


        const icon =
            leafletNamespace.divIcon({
                className:
                    "orders-map-div-icon",

                html: `
                    <div
                        class="
                            orders-map-fixed-pin
                            ${
                                isBase
                                    ? "orders-map-fixed-base"
                                    : "orders-map-fixed-bioexis"
                            }
                        "
                    >
                        ${
                            isBase
                                ? "🏠 БАЗА"
                                : "🏁 BIOEXIS"
                        }
                    </div>
                `,

                iconSize: [
                    92,
                    42
                ],

                iconAnchor: [
                    46,
                    42
                ],

                popupAnchor: [
                    0,
                    -38
                ]
            });


        leafletNamespace
            .marker(
                coordinates,
                {
                    icon,

                    title:
                        location.name
                }
            )
            .addTo(
                targetLayer
            )
            .bindPopup(
                `
                    <div
                        class="orders-map-popup"
                    >
                        <strong
                            class="orders-map-popup-title"
                        >
                            ${escapeHtml(
                                location.name
                            )}
                        </strong>

                        ${
                            location.address

                                ? `
                                    <div
                                        class="orders-map-popup-meta"
                                    >
                                        ${escapeHtml(
                                            location.address
                                        )}
                                    </div>
                                `

                                : ""
                        }
                    </div>
                `
            );


        points.push(
            coordinates
        );
    }


    return points;
}


function setSummary(
    filteredOrders:
        AdminOrderListItem[],

    allSummaries:
        TruckSummary[],

    missingCoordinates:
        number
): void {

    const summary =
        document.querySelector<
            HTMLElement
        >(
            "#k3OrdersMapSummary"
        );


    if (!summary) {
        return;
    }


    const assignedTons =
        filteredOrders.reduce(
            (
                total,
                order
            ) =>
                total +
                currentAssignments(
                    order
                )
                    .reduce(
                        (
                            subtotal,
                            assignment
                        ) =>
                            subtotal +
                            assignment
                                .assignedTons,

                        0
                    ),

            0
        );


    const visibleTruckIds =
        new Set<string>();


    for (
        const order
        of filteredOrders
    ) {

        for (
            const assignment
            of currentAssignments(
                order
            )
        ) {

            if (
                assignment.truckId
            ) {
                visibleTruckIds.add(
                    assignment.truckId
                );
            }
        }
    }


    summary.innerHTML = `
        <strong>
            ${filteredOrders.length}
            адреса
        </strong>

        <span>
            ${visibleTruckIds.size}
            камиона
        </span>

        <span>
            ${escapeHtml(
                formatTons(
                    assignedTons
                )
            )}
            т. текущо зачислени
        </span>

        ${
            missingCoordinates >
            0

                ? `
                    <span
                        class="orders-map-summary-warning"
                    >
                        ⚠️
                        ${missingCoordinates}
                        без GPS
                    </span>
                `

                : ""
        }

        <small>
            Картата показва зачислявания,
            не GPS позицията на камиона.
        </small>
    `;


    void allSummaries;
}


export async function
renderAdminOrdersMap(
    orders:
        AdminOrderListItem[],

    fixedLocations:
        FixedLocation[]
): Promise<void> {

    latestOrders =
        orders;

    latestFixedLocations =
        fixedLocations;


    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3OrdersOperationalMap"
        );


    if (!element) {
        return;
    }


    const summaries =
        truckSummaries(
            orders
        );


    renderToolbar(
        orders,
        summaries
    );


    if (map) {

        map.remove();

        map =
            null;

        layer =
            null;
    }


    try {

        element.innerHTML =
            "";


        leaflet =
            leaflet ||
            await loadLeaflet();


        if (
            !element.isConnected
        ) {
            return;
        }


        map =
            leaflet.map(
                element
            );


        map.setView(
            [
                42.70,
                25.30
            ],
            7
        );


        leaflet
            .tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
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


        layer =
            leaflet
                .layerGroup()
                .addTo(
                    map
                );


        const fixedPoints =
            addFixedLocations(
                leaflet,
                layer,
                fixedLocations
            );


        const filteredOrders =
            filterOrders(
                orders
            );


        const orderPoints:
            LeafletCoordinate[] =
            [];


        let missingCoordinates =
            0;


        for (
            const order
            of filteredOrders
        ) {

            if (
                order.siteLatitude ===
                    null ||
                order.siteLongitude ===
                    null
            ) {

                missingCoordinates +=
                    1;

                continue;
            }


            const coordinates:
                LeafletCoordinate = [
                    order.siteLatitude,
                    order.siteLongitude
                ];


            const icon =
                leaflet.divIcon({
                    className:
                        "orders-map-div-icon",

                    html:
                        orderPinHtml(
                            order,
                            summaries
                        ),

                    iconSize: [
                        110,
                        52
                    ],

                    iconAnchor: [
                        55,
                        52
                    ],

                    popupAnchor: [
                        0,
                        -48
                    ]
                });


            leaflet
                .marker(
                    coordinates,
                    {
                        icon,

                        title:
                            `${order.companyName} — ${order.siteName}`
                    }
                )
                .addTo(
                    layer
                )
                .bindPopup(
                    orderPopupHtml(
                        order,
                        summaries
                    )
                );


            orderPoints.push(
                coordinates
            );
        }


        const fitPoints =
            orderPoints.length

                ? orderPoints

                : fixedPoints;


        if (
            fitPoints.length
        ) {

            map.fitBounds(
                fitPoints,
                {
                    padding: [
                        45,
                        45
                    ],

                    maxZoom:
                        11
                }
            );
        }


        setSummary(
            filteredOrders,
            summaries,
            missingCoordinates
        );


        window.setTimeout(
            () => {
                map?.invalidateSize();
            },
            0
        );


    } catch (error) {

        element.innerHTML = `
            <div
                class="orders-map-error"
            >
                ⚠️
                ${
                    error instanceof Error

                        ? escapeHtml(
                            error.message
                        )

                        : "Картата не можа да бъде заредена."
                }
            </div>
        `;
    }
}


async function focusOrder(
    orderId: string
): Promise<void> {

    const order =
        latestOrders.find(
            item =>
                item.id ===
                orderId
        );


    if (
        !order ||
        order.siteLatitude ===
            null ||
        order.siteLongitude ===
            null
    ) {
        return;
    }


    currentFilter =
        "all";


    await renderAdminOrdersMap(
        latestOrders,
        latestFixedLocations
    );


    map?.setView(
        [
            order.siteLatitude,
            order.siteLongitude
        ],
        13
    );


    document
        .querySelector(
            "#k3OrdersOperationalMap"
        )
        ?.scrollIntoView({
            behavior:
                "smooth",

            block:
                "center"
        });
}


export function
initializeAdminOrdersMapControls(
    root: HTMLElement
): void {

    root.addEventListener(
        "click",
        event => {

            const target =
                event.target;


            if (
                !(
                    target instanceof
                    Element
                )
            ) {
                return;
            }


            const filterButton =
                target.closest<
                    HTMLButtonElement
                >(
                    "[data-orders-map-filter]"
                );


            if (
                filterButton
            ) {

                const value =
                    filterButton
                        .dataset
                        .ordersMapFilter;


                if (!value) {
                    return;
                }


                currentFilter =
                    value as
                    OrdersMapFilter;


                void renderAdminOrdersMap(
                    latestOrders,
                    latestFixedLocations
                );


                return;
            }


            const focusButton =
                target.closest<
                    HTMLButtonElement
                >(
                    "[data-orders-map-focus]"
                );


            if (
                focusButton
            ) {

                const orderId =
                    focusButton
                        .dataset
                        .ordersMapFocus;


                if (orderId) {

                    void focusOrder(
                        orderId
                    );
                }
            }
        }
    );
}
