import {
    supabase
} from "../../shared/api/supabase";


export type AdminOrderStatus =
    | "pending"
    | "partial"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";


export type AdminOrderListItem = {
    id: string;
    orderNumber: string;
    companyName: string;
    siteName: string;
    siteAddress: string;
    requestedTons: number;
    status: AdminOrderStatus;
    note: string | null;
    createdAt: string;
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


function stringValue(
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


function numberValue(
    value: unknown
): number {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


function isStatus(
    value: string
): value is AdminOrderStatus {
    return [
        "pending",
        "partial",
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    ].includes(value);
}


export async function
loadAdminActiveOrders():
Promise<AdminOrderListItem[]> {

    const {
        data,
        error
    } =
        await supabase
            .from("orders")
            .select(
                `
                id,
                order_number,
                company_name_snapshot,
                site_name_snapshot,
                site_address_snapshot,
                requested_tons,
                status,
                note,
                created_at
                `
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
                    ascending: true
                }
            );


    if (error) {
        throw new Error(
            error.message ||
            "Заявките не можаха да бъдат заредени."
        );
    }


    const result:
        AdminOrderListItem[] =
        [];


    for (const row of data || []) {

        if (!isRecord(row)) {
            continue;
        }


        const id =
            stringValue(row.id);

        const status =
            stringValue(
                row.status
            );


        if (
            !id ||
            !isStatus(status)
        ) {
            continue;
        }


        result.push({
            id,

            orderNumber:
                stringValue(
                    row.order_number
                ),

            companyName:
                stringValue(
                    row.company_name_snapshot
                ),

            siteName:
                stringValue(
                    row.site_name_snapshot
                ),

            siteAddress:
                stringValue(
                    row.site_address_snapshot
                ),

            requestedTons:
                numberValue(
                    row.requested_tons
                ),

            status,

            note:
                typeof row.note === "string"
                    ? row.note
                    : null,

            createdAt:
                stringValue(
                    row.created_at
                )
        });
    }


    return result;
}
