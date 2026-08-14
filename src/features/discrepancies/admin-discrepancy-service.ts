import {
    supabase
} from "../../shared/api/supabase";


export type AdminDiscrepancyStatus =
    | "reported"
    | "reviewed";


export type AdminDiscrepancy = {
    id: string;

    tripId: string;
    tripStopId: string;
    orderAssignmentId: string;
    orderId: string;
    companyId: string;

    companyName: string;
    driverName: string;
    truckNumber: string;

    assignedTons: number;
    actualLoadedTons: number;
    differenceTons: number;

    note: string | null;

    status:
        AdminDiscrepancyStatus;

    resolvedAt: string | null;

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


function mapDiscrepancy(
    value: unknown
): AdminDiscrepancy | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        textValue(
            value.id
        );


    const status =
        textValue(
            value.status
        );


    if (
        !id ||
        (
            status !== "reported" &&
            status !== "reviewed"
        )
    ) {
        return null;
    }


    return {
        id,

        tripId:
            textValue(
                value.trip_id
            ),

        tripStopId:
            textValue(
                value.trip_stop_id
            ),

        orderAssignmentId:
            textValue(
                value.order_assignment_id
            ),

        orderId:
            textValue(
                value.order_id
            ),

        companyId:
            textValue(
                value.company_id
            ),

        companyName:
            textValue(
                value.company_name_snapshot
            ),

        driverName:
            textValue(
                value.driver_name_snapshot
            ),

        truckNumber:
            textValue(
                value.truck_number_snapshot
            ),

        assignedTons:
            numberValue(
                value.assigned_tons_snapshot
            ),

        actualLoadedTons:
            numberValue(
                value.actual_loaded_tons
            ),

        differenceTons:
            numberValue(
                value.difference_tons
            ),

        note:
            nullableText(
                value.note
            ),

        status,

        resolvedAt:
            nullableText(
                value.resolved_at
            ),

        createdAt:
            textValue(
                value.created_at
            )
    };
}


export async function
loadAdminDiscrepancies():
Promise<AdminDiscrepancy[]> {

    const {
        data,
        error
    } =
        await supabase
            .from(
                "discrepancies"
            )
            .select(
                `
                id,
                trip_id,
                trip_stop_id,
                order_assignment_id,
                order_id,
                company_id,
                company_name_snapshot,
                driver_name_snapshot,
                truck_number_snapshot,
                assigned_tons_snapshot,
                actual_loaded_tons,
                difference_tons,
                note,
                status,
                resolved_at,
                created_at
                `
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(
                500
            );


    if (error) {
        throw new Error(
            error.message ||
            "Несъответствията не можаха да бъдат заредени."
        );
    }


    return (
        data || []
    )
        .map(
            mapDiscrepancy
        )
        .filter(
            (
                item
            ): item is AdminDiscrepancy =>
                item !== null
        );
}


export async function
markAdminDiscrepancyReviewed(
    discrepancyId: string
): Promise<void> {

    if (!discrepancyId) {
        throw new Error(
            "Несъответствието не е избрано."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "discrepancies_mark_reviewed",
            {
                p_discrepancy_id:
                    discrepancyId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Сигналът не можа да бъде отбелязан като прегледан."
        );
    }
}
