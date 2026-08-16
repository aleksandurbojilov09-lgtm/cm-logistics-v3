import type {
    AdminOrderListItem
} from "../../../features/orders/admin-orders-service";


export type AdminOrderLocationGroup = {
    key: string;

    siteName: string;
    address: string;

    latitude: number | null;
    longitude: number | null;

    orders:
        AdminOrderListItem[];
};


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


function normalizeLocationText(
    value: string
): string {

    return value
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toLocaleLowerCase(
            "bg-BG"
        );
}


function locationKey(
    order:
        AdminOrderListItem
): string {

    const address =
        normalizeLocationText(
            order.siteAddress
        );


    /*
     * Адресът е водещ за UI групирането.
     *
     * Няколко отделни заявки могат да са
     * за един и същ физически обект.
     *
     * Самите заявки НЕ се обединяват.
     */
    if (address) {

        return (
            `address:${address}`
        );
    }


    if (
        order.siteLatitude !== null &&
        order.siteLongitude !== null
    ) {

        return (
            `geo:${
                order.siteLatitude
                    .toFixed(5)
            }:${
                order.siteLongitude
                    .toFixed(5)
            }`
        );
    }


    return (
        `order:${order.id}`
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


            /*
             * Ако първата заявка няма координати,
             * но следваща на същия адрес има,
             * използваме наличните координати.
             */
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
