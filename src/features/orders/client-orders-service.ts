import {
    supabase
} from "../../shared/api/supabase";


export type ClientOrderStatus =
    | "pending"
    | "partial"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";


export type ClientAssignmentStatus =
    | "assigned"
    | "accepted"
    | "en_route"
    | "arrived"
    | "loaded"
    | "completed"
    | "cancelled";


export type ClientSiteOption = {
    id: string;
    name: string;
    address: string;
};


export type ClientOrderAssignment = {
    id: string;
    assignedTons: number;
    loadedTons: number | null;
    status: ClientAssignmentStatus;
    truckNumber: string;
    trailerNumber: string;
    trailerPermit: string | null;
    assignedAt: string;
};


export type ClientOrder = {
    id: string;
    orderNumber: string;
    companyId: string;
    siteId: string;
    companyName: string;
    siteName: string;
    siteAddress: string;
    requestedTons: number;
    note: string | null;
    status: ClientOrderStatus;
    createdAt: string;
    completedAt: string | null;
    cancelledAt: string | null;
    assignments: ClientOrderAssignment[];
};


export type ClientPortalContext = {
    userId: string;
    displayName: string;
    companyId: string;
    companyName: string;
    sites: ClientSiteOption[];
};


type JsonRecord =
    Record<string, unknown>;


function isRecord(
    value: unknown
): value is JsonRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}


function textValue(
    value: unknown
): string {
    if (
        typeof value === "string"
    ) {
        return value;
    }

    if (
        typeof value === "number"
    ) {
        return String(value);
    }

    return "";
}


function nullableText(
    value: unknown
): string | null {
    return (
        typeof value === "string" &&
        value.trim()
    )
        ? value
        : null;
}


function numberValue(
    value: unknown
): number {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


function isOrderStatus(
    value: string
): value is ClientOrderStatus {
    return [
        "pending",
        "partial",
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    ].includes(value);
}


function isAssignmentStatus(
    value: string
): value is ClientAssignmentStatus {
    return [
        "assigned",
        "accepted",
        "en_route",
        "arrived",
        "loaded",
        "completed",
        "cancelled"
    ].includes(value);
}


function mapAssignment(
    value: unknown
): ClientOrderAssignment | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        textValue(value.id);

    const status =
        textValue(value.status);

    if (
        !id ||
        !isAssignmentStatus(status)
    ) {
        return null;
    }

    return {
        id,

        assignedTons:
            numberValue(
                value.assigned_tons
            ),

        loadedTons:
            value.loaded_tons === null
                ? null
                : numberValue(
                    value.loaded_tons
                ),

        status,

        truckNumber:
            textValue(
                value.truck_number_snapshot
            ),

        trailerNumber:
            textValue(
                value.trailer_number_snapshot
            ),

        trailerPermit:
            nullableText(
                value.trailer_permit_snapshot
            ),

        assignedAt:
            textValue(
                value.assigned_at
            )
    };
}


function mapOrder(
    value: unknown
): ClientOrder | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        textValue(value.id);

    const status =
        textValue(value.status);

    if (
        !id ||
        !isOrderStatus(status)
    ) {
        return null;
    }

    const assignments =
        Array.isArray(
            value.order_assignments
        )
            ? value.order_assignments
                .map(mapAssignment)
                .filter(
                    (
                        item
                    ): item is ClientOrderAssignment =>
                        item !== null
                )
            : [];

    return {
        id,

        orderNumber:
            textValue(
                value.order_number
            ),

        companyId:
            textValue(
                value.company_id
            ),

        siteId:
            textValue(
                value.site_id
            ),

        companyName:
            textValue(
                value.company_name_snapshot
            ),

        siteName:
            textValue(
                value.site_name_snapshot
            ),

        siteAddress:
            textValue(
                value.site_address_snapshot
            ),

        requestedTons:
            numberValue(
                value.requested_tons
            ),

        note:
            nullableText(
                value.note
            ),

        status,

        createdAt:
            textValue(
                value.created_at
            ),

        completedAt:
            nullableText(
                value.completed_at
            ),

        cancelledAt:
            nullableText(
                value.cancelled_at
            ),

        assignments
    };
}


const ORDER_SELECT = `
    id,
    order_number,
    company_id,
    site_id,
    requested_tons,
    note,
    status,
    company_name_snapshot,
    site_name_snapshot,
    site_address_snapshot,
    created_at,
    completed_at,
    cancelled_at,
    order_assignments (
        id,
        assigned_tons,
        loaded_tons,
        status,
        truck_number_snapshot,
        trailer_number_snapshot,
        trailer_permit_snapshot,
        assigned_at
    )
`;


export async function
loadClientPortalContext():
Promise<ClientPortalContext> {

    const {
        data: authData,
        error: authError
    } =
        await supabase.auth
            .getUser();


    if (
        authError ||
        !authData.user
    ) {
        throw new Error(
            "Невалидна потребителска сесия."
        );
    }


    const userId =
        authData.user.id;


    const [
        profileResult,
        membershipResult
    ] =
        await Promise.all([

            supabase
                .from("profiles")
                .select(
                    "display_name"
                )
                .eq(
                    "id",
                    userId
                )
                .single(),

            supabase
                .from("client_users")
                .select(
                    "company_id"
                )
                .eq(
                    "user_id",
                    userId
                )
                .eq(
                    "is_primary",
                    true
                )
                .maybeSingle()
        ]);


    if (
        profileResult.error ||
        !profileResult.data
    ) {
        throw new Error(
            "Клиентският профил не можа да бъде зареден."
        );
    }


    if (
        membershipResult.error ||
        !membershipResult.data
    ) {
        throw new Error(
            "Клиентският акаунт не е свързан с фирма."
        );
    }


    const companyId =
        textValue(
            membershipResult
                .data
                .company_id
        );


    const [
        companyResult,
        sitesResult
    ] =
        await Promise.all([

            supabase
                .from(
                    "client_companies"
                )
                .select(
                    "company_name"
                )
                .eq(
                    "id",
                    companyId
                )
                .single(),

            supabase
                .from(
                    "client_sites"
                )
                .select(
                    `
                    id,
                    site_name,
                    address
                    `
                )
                .eq(
                    "company_id",
                    companyId
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "site_name"
                )
        ]);


    if (
        companyResult.error ||
        !companyResult.data
    ) {
        throw new Error(
            "Клиентската фирма не можа да бъде заредена."
        );
    }


    if (sitesResult.error) {
        throw new Error(
            "Обектите не можаха да бъдат заредени."
        );
    }


    const sites:
        ClientSiteOption[] =
        [];


    for (
        const row
        of sitesResult.data || []
    ) {
        if (!isRecord(row)) {
            continue;
        }

        const id =
            textValue(row.id);

        const name =
            textValue(
                row.site_name
            );

        const address =
            textValue(
                row.address
            );

        if (
            id &&
            name &&
            address
        ) {
            sites.push({
                id,
                name,
                address
            });
        }
    }


    return {
        userId,

        displayName:
            textValue(
                profileResult
                    .data
                    .display_name
            ),

        companyId,

        companyName:
            textValue(
                companyResult
                    .data
                    .company_name
            ),

        sites
    };
}


export async function
loadClientActiveOrders(
    companyId: string
): Promise<ClientOrder[]> {

    const {
        data,
        error
    } =
        await supabase
            .from("orders")
            .select(
                ORDER_SELECT
            )
            .eq(
                "company_id",
                companyId
            )
            .in(
                "status",
                [
                    "pending",
                    "partial",
                    "assigned",
                    "in_progress"
                ]
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw new Error(
            error.message ||
            "Заявките не можаха да бъдат заредени."
        );
    }


    return (
        data || []
    )
        .map(mapOrder)
        .filter(
            (
                order
            ): order is ClientOrder =>
                order !== null
        );
}


function localDayRange(
    dateValue: string
): {
    start: string;
    end: string;
} {

    const start =
        new Date(
            `${dateValue}T00:00:00`
        );


    if (
        Number.isNaN(
            start.getTime()
        )
    ) {
        throw new Error(
            "Невалидна дата."
        );
    }


    const end =
        new Date(start);


    end.setDate(
        end.getDate() + 1
    );


    return {
        start:
            start.toISOString(),

        end:
            end.toISOString()
    };
}


export async function
loadClientOrdersForDate(
    companyId: string,
    dateValue: string
): Promise<ClientOrder[]> {

    const range =
        localDayRange(
            dateValue
        );


    const {
        data,
        error
    } =
        await supabase
            .from("orders")
            .select(
                ORDER_SELECT
            )
            .eq(
                "company_id",
                companyId
            )
            .gte(
                "created_at",
                range.start
            )
            .lt(
                "created_at",
                range.end
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {
        throw new Error(
            error.message ||
            "Историята не можа да бъде заредена."
        );
    }


    return (
        data || []
    )
        .map(mapOrder)
        .filter(
            (
                order
            ): order is ClientOrder =>
                order !== null
        );
}


function tonsToKg(
    tons: number
): number {

    if (
        !Number.isFinite(tons) ||
        tons <= 0
    ) {
        throw new Error(
            "Въведете валидно количество."
        );
    }


    const kg =
        Math.round(
            tons * 1000
        );


    if (kg <= 0) {
        throw new Error(
            "Въведете валидно количество."
        );
    }


    return kg;
}


export async function
createClientOrder(
    siteId: string,
    requestedTons: number,
    note: string
): Promise<string> {

    const requestedKg =
        tonsToKg(
            requestedTons
        );


    const {
        data,
        error
    } =
        await supabase.rpc(
            "orders_create_client",
            {
                p_site_id:
                    siteId,

                p_requested_kg:
                    requestedKg,

                p_note:
                    note.trim() ||
                    null
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Заявката не можа да бъде създадена."
        );
    }


    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Заявката беше създадена, но липсва нейният идентификатор."
        );
    }


    return data;
}


export async function
updateClientOrder(
    orderId: string,
    requestedTons: number,
    note: string
): Promise<void> {

    const requestedKg =
        tonsToKg(
            requestedTons
        );


    const {
        error
    } =
        await supabase.rpc(
            "orders_update_client",
            {
                p_order_id:
                    orderId,

                p_requested_kg:
                    requestedKg,

                p_note:
                    note.trim() ||
                    null
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Заявката не можа да бъде редактирана."
        );
    }
}
