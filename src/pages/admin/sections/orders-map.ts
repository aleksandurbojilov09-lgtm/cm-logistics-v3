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
    groupOrdersByLocation,
    locationGroupCompanyLabel,
    type AdminOrderLocationGroup
} from "./orders-location-grouping";

import {
    loadLeaflet,
    type LeafletCoordinate,
    type LeafletLayerGroup,
    type LeafletMap,
    type LeafletNamespace
} from "../../../shared/lib/leaflet-loader";


export type AdminOrdersMapOptions = {
    selectedOrderId:
        string | null;

    selectedTruckId:
        string | null;

    selectedTruckNumber:
        string | null;

    selectedTruckFreeTons:
        number | null;

    selectedTruckRouteNumbers:
        Record<string, string>;

    onSelectOrder:
        (
            orderId: string
        ) => void;
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


function formatSignedTons(
    value: number
): string {

    const sign =
        value > 0
            ? "+"
            : "";

    return (
        `${sign}${formatTons(
            value
        )}`
    );
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


function truckColorIndex(
    truckId: string
): number {

    let hash =
        0;

    for (
        let index = 0;
        index < truckId.length;
        index += 1
    ) {
        hash =
            (
                hash * 31 +
                truckId.charCodeAt(
                    index
                )
            ) >>> 0;
    }

    return hash % 8;
}


function truckColorClass(
    truckId: string
): string {

    return (
        `orders-map-color-${
            truckColorIndex(
                truckId
            )
        }`
    );
}


function markerClass(
    order:
        AdminOrderListItem,

    options:
        AdminOrdersMapOptions
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


    const classes =
        [
            "orders-map-pin"
        ];


    if (
        truckIds.length === 0
    ) {
        classes.push(
            "orders-map-pin-unassigned"
        );
    } else if (
        truckIds.length === 1
    ) {
        classes.push(
            truckColorClass(
                truckIds[0]
            )
        );
    } else {
        classes.push(
            "orders-map-pin-mixed"
        );
    }


    if (
        order.loadingRamp
    ) {
        classes.push(
            "orders-map-pin-ramp"
        );
    }


    if (
        order.latestLoadingWarning
    ) {
        classes.push(
            "orders-map-pin-discrepancy"
        );
    }


    if (
        options.selectedOrderId ===
        order.id
    ) {
        classes.push(
            "orders-map-pin-selected"
        );
    }


    if (
        options.selectedTruckId &&
        truckIds.length > 0 &&
        !truckIds.includes(
            options.selectedTruckId
        )
    ) {
        classes.push(
            "orders-map-pin-muted"
        );
    }


    return classes.join(" ");
}


function markerLabel(
    order:
        AdminOrderListItem,

    options:
        AdminOrdersMapOptions
): string {

    const routeNumber =
        options
            .selectedTruckRouteNumbers[
                order.id
            ];


    if (routeNumber) {
        return routeNumber;
    }


    if (
        order.remainingTons >
        0
    ) {
        return formatTons(
            order.remainingTons
        );
    }


    if (
        order.status ===
        "in_progress"
    ) {
        return "▶";
    }


    return "✓";
}


function groupMarkerClass(
    group:
        AdminOrderLocationGroup,

    options:
        AdminOrdersMapOptions
): string {

    if (
        group.orders.length ===
        1
    ) {

        return markerClass(
            group.orders[0],
            options
        );
    }


    const assignments =
        group.orders.flatMap(
            currentAssignments
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


    const classes = [
        "orders-map-pin",
        "orders-map-pin-grouped"
    ];


    if (
        truckIds.length ===
        0
    ) {

        classes.push(
            "orders-map-pin-unassigned"
        );

    } else if (
        truckIds.length ===
        1
    ) {

        classes.push(
            truckColorClass(
                truckIds[0]
            )
        );

    } else {

        classes.push(
            "orders-map-pin-mixed"
        );
    }


    if (
        group.orders.some(
            order =>
                order.loadingRamp
        )
    ) {

        classes.push(
            "orders-map-pin-ramp"
        );
    }


    if (
        group.orders.some(
            order =>
                Boolean(
                    order.latestLoadingWarning
                )
        )
    ) {

        classes.push(
            "orders-map-pin-discrepancy"
        );
    }


    if (
        options.selectedOrderId &&
        group.orders.some(
            order =>
                order.id ===
                options.selectedOrderId
        )
    ) {

        classes.push(
            "orders-map-pin-selected"
        );
    }


    if (
        options.selectedTruckId &&
        truckIds.length >
        0 &&
        !truckIds.includes(
            options.selectedTruckId
        )
    ) {

        classes.push(
            "orders-map-pin-muted"
        );
    }


    return classes.join(
        " "
    );
}


function groupMarkerLabel(
    group:
        AdminOrderLocationGroup,

    options:
        AdminOrdersMapOptions
): string {

    if (
        group.orders.length ===
        1
    ) {

        return markerLabel(
            group.orders[0],
            options
        );
    }


    const routeNumbers =
        group.orders
            .flatMap(
                order => {

                    const value =
                        options
                            .selectedTruckRouteNumbers[
                                order.id
                            ];


                    return value
                        ? value
                            .split("·")
                            .filter(
                                Boolean
                            )
                        : [];
                }
            );


    if (
        routeNumbers.length ===
        1
    ) {

        return routeNumbers[0];
    }


    if (
        routeNumbers.length ===
        2
    ) {

        return (
            `${routeNumbers[0]}·${routeNumbers[1]}`
        );
    }


    if (
        routeNumbers.length >
        2
    ) {

        return (
            `${routeNumbers[0]}+${routeNumbers.length - 1}`
        );
    }


    /*
     * Без активна маршрутна номерация
     * маркерът показва колко отделни
     * заявки има на физическия адрес.
     */
    return String(
        group.orders.length
    );
}


function statusLabel(
    order:
        AdminOrderListItem
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


function popupHtml(
    order:
        AdminOrderListItem,

    options:
        AdminOrdersMapOptions
): string {

    const assignments =
        currentAssignments(
            order
        );


    const selectedTruckReady =
        Boolean(
            options.selectedTruckId &&
            options.selectedTruckNumber &&
            options.selectedTruckFreeTons !== null
        );


    const selectedTruckFreeTons =
        options.selectedTruckFreeTons ??
        0;


    const quickAssignTons =
        selectedTruckReady
            ? Math.min(
                order.remainingTons,
                selectedTruckFreeTons
            )
            : 0;


    let quickActionHtml =
        "";


    if (
        order.remainingTons <=
        0
    ) {

        quickActionHtml = `
            <div
                class="orders-map-popup-quick-state"
            >
                ✅ Няма оставащи тонове
            </div>
        `;

    } else if (
        !options.selectedTruckId
    ) {

        quickActionHtml = `
            <div
                class="orders-map-popup-quick-state"
            >
                🚛 Първо избери активен камион
            </div>
        `;

    } else if (
        !selectedTruckReady
    ) {

        quickActionHtml = `
            <div
                class="orders-map-popup-quick-state"
            >
                ⚠️ Избраният камион е само за преглед
            </div>
        `;

    } else if (
        selectedTruckFreeTons <=
        0
    ) {

        quickActionHtml = `
            <div
                class="orders-map-popup-quick-state"
            >
                🚛
                ${escapeHtml(
                    options.selectedTruckNumber ||
                    "Камионът"
                )}
                е запълнен
            </div>
        `;

    } else {

        quickActionHtml = `
            <button
                type="button"
                class="orders-map-popup-quick-assign"
                data-orders-action="quick-assign"
                data-order-id="${escapeHtml(
                    order.id
                )}"
            >
                <strong>
                    ➕ Добави към
                    ${escapeHtml(
                        options.selectedTruckNumber ||
                        "камиона"
                    )}
                </strong>

                <span>
                    до
                    ${escapeHtml(
                        formatTons(
                            quickAssignTons
                        )
                    )}
                    т.
                </span>
            </button>
        `;
    }


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
                <strong>
                    📍
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

            ${
                order.loadingRamp

                    ? `
                        <div
                            class="orders-map-popup-ramp"
                        >
                            🚪 РАМПА
                            ·
                            ЗАДЪЛЖИТЕЛНО ПЪРВА СПИРКА
                        </div>
                    `

                    : ""
            }

            ${
                order.latestLoadingWarning

                    ? `
                        <div
                            class="orders-map-popup-discrepancy"
                        >
                            <strong>
                                ⚠️ Последното товарене е с несъответствие
                            </strong>

                            <span>
                                Зачислени
                                ${escapeHtml(
                                    formatTons(
                                        order.latestLoadingWarning
                                            .assignedTons
                                    )
                                )}
                                т.
                                ·
                                Реално
                                ${escapeHtml(
                                    formatTons(
                                        order.latestLoadingWarning
                                            .actualLoadedTons
                                    )
                                )}
                                т.
                                ·
                                Разлика
                                ${escapeHtml(
                                    formatSignedTons(
                                        order.latestLoadingWarning
                                            .differenceTons
                                    )
                                )}
                                т.
                            </span>
                        </div>
                    `

                    : ""
            }


            <div
                class="orders-map-popup-meta"
            >
                ${escapeHtml(
                    statusLabel(
                        order
                    )
                )}
                ·
                Заявка
                #${escapeHtml(
                    order.orderNumber
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
                    Изпълнени
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.completedTons
                            )
                        )}
                        т.
                    </strong>
                </span>

                <span>
                    Зачислени сега
                    <strong>
                        ${escapeHtml(
                            formatTons(
                                order.activeAssignedTons
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

                                                <small>
                                                    ${escapeHtml(
                                                        assignment.driverName ||
                                                        "-"
                                                    )}
                                                    ·
                                                    ${escapeHtml(
                                                        formatTons(
                                                            assignment.assignedTons
                                                        )
                                                    )}
                                                    т.
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
                            ⚠️ Няма текущо зачислен камион
                        </div>
                    `
            }

            <div
                class="orders-map-popup-quick-action"
            >
                ${quickActionHtml}
            </div>
        </div>
    `;
}


function groupPopupHtml(
    group:
        AdminOrderLocationGroup,

    options:
        AdminOrdersMapOptions
): string {

    if (
        group.orders.length ===
        1
    ) {

        return popupHtml(
            group.orders[0],
            options
        );
    }


    const selectedTruckReady =
        Boolean(
            options.selectedTruckId &&
            options.selectedTruckNumber &&
            options.selectedTruckFreeTons !==
                null
        );


    return `
        <div
            class="
                orders-map-popup
                orders-map-group-popup
            "
        >
            <div
                class="orders-map-group-header"
            >
                <strong>
                    🏢
                    ${escapeHtml(
                        locationGroupCompanyLabel(
                            group
                        )
                    )}
                </strong>

                <span>
                    📍
                    ${escapeHtml(
                        group.address ||
                        group.siteName ||
                        "Адрес"
                    )}
                    ·
                    ${group.orders.length}
                    ${
                        group.orders.length === 1
                            ? "заявка"
                            : "заявки"
                    }
                </span>
            </div>


            <div
                class="orders-map-group-orders"
            >
                ${group.orders
                    .map(
                        order => {

                            const assignments =
                                currentAssignments(
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


                            const maxQuickTons =
                                selectedTruckReady

                                    ? Math.min(
                                        order.remainingTons,

                                        options
                                            .selectedTruckFreeTons ??
                                        0
                                    )

                                    : 0;


                            const canQuickAssign =
                                selectedTruckReady &&
                                maxQuickTons >
                                0;


                            return `
                                <div
                                    class="orders-map-group-order-row"
                                >
                                    <button
                                        type="button"
                                        class="orders-map-group-order-main"
                                        data-orders-action="select-order"
                                        data-order-id="${escapeHtml(
                                            order.id
                                        )}"
                                    >
                                        <strong>
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
                                                    order
                                                )
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

                                        ${
                                            order.loadingRamp

                                                ? `
                                                    <small
                                                        class="orders-map-group-ramp"
                                                    >
                                                        🚪 РАМПА
                                                    </small>
                                                `

                                                : ""
                                        }

                                        ${
                                            order.latestLoadingWarning

                                                ? `
                                                    <small
                                                        class="orders-map-group-warning"
                                                    >
                                                        ⚠️ Несъответствие
                                                    </small>
                                                `

                                                : ""
                                        }
                                    </button>


                                    <div
                                        class="orders-map-group-order-side"
                                    >
                                        <strong>
                                            ${escapeHtml(
                                                formatTons(
                                                    order.remainingTons
                                                )
                                            )}
                                            т.
                                        </strong>

                                        ${
                                            canQuickAssign

                                                ? `
                                                    <button
                                                        type="button"
                                                        class="orders-map-group-quick"
                                                        data-orders-action="quick-assign"
                                                        data-order-id="${escapeHtml(
                                                            order.id
                                                        )}"
                                                        title="Добави към ${
                                                            escapeHtml(
                                                                options.selectedTruckNumber ||
                                                                "камиона"
                                                            )
                                                        }"
                                                        aria-label="Бързо зачисляване"
                                                    >
                                                        ➕
                                                    </button>
                                                `

                                                : ""
                                        }
                                    </div>
                                </div>
                            `;
                        }
                    )
                    .join("")}
            </div>
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
                        title="${escapeHtml(
                            location.name
                        )}"
                    >
                        ${
                            isBase
                                ? "🏠"
                                : "🏁"
                        }
                    </div>
                `,

                iconSize: [
                    36,
                    36
                ],

                iconAnchor: [
                    18,
                    36
                ],

                popupAnchor: [
                    0,
                    -32
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
                                ? escapeHtml(
                                    location.address
                                )
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


export async function
renderAdminOrdersMap(
    orders:
        AdminOrderListItem[],

    fixedLocations:
        FixedLocation[],

    options:
        AdminOrdersMapOptions
): Promise<void> {

    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3OrdersOperationalMap"
        );


    if (!element) {
        return;
    }


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


        const orderPoints:
            LeafletCoordinate[] =
            [];


        const locationGroups =
            groupOrdersByLocation(
                orders
            );


        for (
            const group
            of locationGroups
        ) {

            if (
                group.latitude ===
                    null ||
                group.longitude ===
                    null
            ) {
                continue;
            }


            const coordinates:
                LeafletCoordinate = [
                    group.latitude,
                    group.longitude
                ];


            const groupTitle =
                group.orders.length ===
                1

                    ? `${
                        group.orders[0]
                            .companyName
                    } — ${
                        group.orders[0]
                            .siteName
                    }`

                    : `${
                        locationGroupCompanyLabel(
                            group
                        )
                    } — ${
                        group.orders.length
                    } заявки`;


            const icon =
                leaflet.divIcon({
                    className:
                        "orders-map-div-icon",

                    html: `
                        <div
                            class="${escapeHtml(
                                groupMarkerClass(
                                    group,
                                    options
                                )
                            )}"
                            title="${escapeHtml(
                                groupTitle
                            )}"
                        >
                            ${escapeHtml(
                                groupMarkerLabel(
                                    group,
                                    options
                                )
                            )}
                        </div>
                    `,

                    iconSize: [
                        40,
                        40
                    ],

                    iconAnchor: [
                        20,
                        40
                    ],

                    popupAnchor: [
                        0,
                        -36
                    ]
                });


            const marker =
                leaflet
                    .marker(
                        coordinates,
                        {
                            icon,

                            title:
                                groupTitle
                        }
                    )
                    .addTo(
                        layer
                    )
                    .bindPopup(
                        groupPopupHtml(
                            group,
                            options
                        )
                    );


            /*
             * При единствена заявка пазим
             * старото директно избиране.
             *
             * При няколко заявки НЕ избираме
             * произволна — потребителят избира
             * точната от popup-а.
             */
            if (
                group.orders.length ===
                1
            ) {

                marker.on(
                    "click",
                    () => {

                        options
                            .onSelectOrder(
                                group.orders[0]
                                    .id
                            );
                    }
                );
            }


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
