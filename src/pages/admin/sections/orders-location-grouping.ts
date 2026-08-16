import type {
    AdminOrderListItem
} from "../../../features/orders/admin-orders-service";


export type AdminOrderLocationGroup = {
    key: string;

    companyId: string;
    siteId: string;

    siteName: string;
    address: string;

    latitude: number | null;
    longitude: number | null;

    orders:
        AdminOrderListItem[];
};


const ASSIGNABLE_STATUSES =
    new Set([
        "pending",
        "partial",
        "assigned"
    ]);


function compareOrdersOldestFirst(
    first:
        AdminOrderListItem,

    second:
        AdminOrderListItem
): number {

    const createdAtDifference =
        first.createdAt.localeCompare(
            second.createdAt
        );


    if (
        createdAtDifference !==
        0
    ) {
        return createdAtDifference;
    }


    return first.id.localeCompare(
        second.id
    );
}


export function
locationGroupCompanyLabel(
    group:
        AdminOrderLocationGroup
): string {

    const companyNames =
        Array.from(
            new Set(
                group.orders
                    .map(
                        order =>
                            order.companyName
                                .trim()
                    )
                    .filter(
                        Boolean
                    )
            )
        );


    if (
        companyNames.length ===
        0
    ) {
        return "Фирма";
    }


    if (
        companyNames.length ===
        1
    ) {
        return companyNames[0];
    }


    return (
        `${companyNames[0]} + още ${companyNames.length - 1}`
    );
}


function locationKey(
    order:
        AdminOrderListItem
): string {

    const companyId =
        order.companyId.trim();

    const siteId =
        order.siteId.trim();


    /*
     * Реалната operational location identity е
     * company_id + site_id.
     *
     * Snapshot адресът и координатите НЕ участват
     * в identity-то.
     */
    if (
        companyId &&
        siteId
    ) {

        return (
            `location:${companyId}:${siteId}`
        );
    }


    /*
     * Ако legacy/невалиден ред няма identity,
     * не го сливаме погрешно с друг адрес.
     */
    return (
        `order:${order.id}`
    );
}


export function
locationGroupAssignableOrders(
    group:
        AdminOrderLocationGroup
): AdminOrderListItem[] {

    return group.orders
        .filter(
            order =>
                ASSIGNABLE_STATUSES.has(
                    order.status
                ) &&
                order.remainingTons >
                    0
        )
        .slice()
        .sort(
            compareOrdersOldestFirst
        );
}


export function
locationGroupTotalRemainingTons(
    group:
        AdminOrderLocationGroup
): number {

    return locationGroupAssignableOrders(
        group
    ).reduce(
        (
            total,
            order
        ) =>
            total +
            order.remainingTons,

        0
    );
}


export function
locationGroupPreviousRemainingTons(
    group:
        AdminOrderLocationGroup
): number {

    const openOrders =
        locationGroupAssignableOrders(
            group
        );


    return openOrders
        .slice(
            0,
            -1
        )
        .reduce(
            (
                total,
                order
            ) =>
                total +
                order.remainingTons,

            0
        );
}


export function
locationGroupNewestAssignableOrder(
    group:
        AdminOrderLocationGroup
): AdminOrderListItem | null {

    const openOrders =
        locationGroupAssignableOrders(
            group
        );


    return (
        openOrders[
            openOrders.length - 1
        ] ||
        null
    );
}


export function
groupOrdersByLocation(
    orders:
        AdminOrderListItem[]
): AdminOrderLocationGroup[] {

    const groups =
        new Map<
            string,
            AdminOrderLocationGroup
        >();


    for (
        const order
        of orders
    ) {

        const key =
            locationKey(
                order
            );


        const existing =
            groups.get(
                key
            );


        if (existing) {

            existing.orders.push(
                order
            );


            if (
                existing.latitude === null &&
                existing.longitude === null &&
                order.siteLatitude !== null &&
                order.siteLongitude !== null
            ) {

                existing.latitude =
                    order.siteLatitude;

                existing.longitude =
                    order.siteLongitude;
            }


            continue;
        }


        groups.set(
            key,
            {
                key,

                companyId:
                    order.companyId,

                siteId:
                    order.siteId,

                siteName:
                    order.siteName,

                address:
                    order.siteAddress,

                latitude:
                    order.siteLatitude,

                longitude:
                    order.siteLongitude,

                orders: [
                    order
                ]
            }
        );
    }


    return Array.from(
        groups.values()
    );
}
