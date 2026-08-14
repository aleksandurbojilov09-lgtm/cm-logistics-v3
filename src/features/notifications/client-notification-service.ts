import {
    supabase
} from "../../shared/api/supabase";


export type ClientDriverNotification = {
    id: string;
    type: string;

    companyId: string;

    tripId: string | null;
    tripStopId: string | null;
    orderAssignmentId: string;

    title: string;
    message: string;

    requiresConfirmation: boolean;

    confirmed: boolean;
    confirmedAt: string | null;

    createdAt: string;
};


export type ClientDiscrepancy = {
    id: string;

    tripId: string;
    tripStopId: string;
    orderAssignmentId: string;

    companyName: string;
    driverName: string;
    truckNumber: string;

    assignedTons: number;
    actualLoadedTons: number;
    differenceTons: number;

    note: string | null;

    status:
        | "reported"
        | "reviewed";

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


function mapNotification(
    value: unknown
): ClientDriverNotification | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        textValue(
            value.id
        );


    const assignmentId =
        textValue(
            value.orderAssignmentId
        );


    if (
        !id ||
        !assignmentId
    ) {
        return null;
    }


    return {
        id,

        type:
            textValue(
                value.type
            ),

        companyId:
            textValue(
                value.companyId
            ),

        tripId:
            nullableText(
                value.tripId
            ),

        tripStopId:
            nullableText(
                value.tripStopId
            ),

        orderAssignmentId:
            assignmentId,

        title:
            textValue(
                value.title
            ),

        message:
            textValue(
                value.message
            ),

        requiresConfirmation:
            value.requiresConfirmation ===
                true,

        confirmed:
            value.confirmed ===
                true,

        confirmedAt:
            nullableText(
                value.confirmedAt
            ),

        createdAt:
            textValue(
                value.createdAt
            )
    };
}


function mapDiscrepancy(
    value: unknown
): ClientDiscrepancy | null {

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
loadClientActiveNotifications():
Promise<ClientDriverNotification[]> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "notifications_get_client_active"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Известията не можаха да бъдат заредени."
        );
    }


    if (!Array.isArray(data)) {
        return [];
    }


    return data
        .map(
            mapNotification
        )
        .filter(
            (
                item
            ): item is ClientDriverNotification =>
                item !== null
        );
}


export async function
confirmClientDriverEta(
    notificationId: string
): Promise<void> {

    if (!notificationId) {
        throw new Error(
            "Известието не е избрано."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "notifications_confirm_driver_eta",
            {
                p_notification_id:
                    notificationId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Известието не можа да бъде потвърдено."
        );
    }
}


export async function
loadClientDiscrepancies():
Promise<ClientDiscrepancy[]> {

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
                100
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
            ): item is ClientDiscrepancy =>
                item !== null
        );
}
