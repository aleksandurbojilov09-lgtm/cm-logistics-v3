import {
    supabase
} from "../../shared/api/supabase";


export type DriverInteraction = {
    assignmentId: string;

    stopId:
        string | null;

    notificationId:
        string | null;

    etaSentAt:
        string | null;

    etaConfirmed:
        boolean;

    etaConfirmedAt:
        string | null;

    discrepancyId:
        string | null;

    discrepancyStatus:
        | "reported"
        | "reviewed"
        | null;

    actualLoadedTons:
        number | null;

    differenceTons:
        number | null;
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


function nullableNumber(
    value: unknown
): number | null {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    const parsed =
        Number(value);


    return Number.isFinite(parsed)
        ? parsed
        : null;
}


function mapInteraction(
    value: unknown
): DriverInteraction | null {

    if (!isRecord(value)) {
        return null;
    }


    const assignmentId =
        textValue(
            value.assignmentId
        );


    if (!assignmentId) {
        return null;
    }


    const discrepancyStatusValue =
        nullableText(
            value.discrepancyStatus
        );


    const discrepancyStatus =
        discrepancyStatusValue ===
            "reported" ||
        discrepancyStatusValue ===
            "reviewed"

            ? discrepancyStatusValue

            : null;


    return {
        assignmentId,

        stopId:
            nullableText(
                value.stopId
            ),

        notificationId:
            nullableText(
                value.notificationId
            ),

        etaSentAt:
            nullableText(
                value.etaSentAt
            ),

        etaConfirmed:
            value.etaConfirmed ===
                true,

        etaConfirmedAt:
            nullableText(
                value.etaConfirmedAt
            ),

        discrepancyId:
            nullableText(
                value.discrepancyId
            ),

        discrepancyStatus,

        actualLoadedTons:
            nullableNumber(
                value.actualLoadedTons
            ),

        differenceTons:
            nullableNumber(
                value.differenceTons
            )
    };
}


function actualTonsToKg(
    tons: number
): number {

    if (
        !Number.isFinite(tons) ||
        tons < 0
    ) {
        throw new Error(
            "Въведете валидно реално натоварено количество."
        );
    }


    const kg =
        Math.round(
            tons * 1000
        );


    if (kg < 0) {
        throw new Error(
            "Въведете валидно реално натоварено количество."
        );
    }


    return kg;
}


export async function
loadDriverInteractions():
Promise<DriverInteraction[]> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_get_driver_interactions"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Състоянието на известията не можа да бъде заредено."
        );
    }


    if (!Array.isArray(data)) {
        return [];
    }


    return data
        .map(
            mapInteraction
        )
        .filter(
            (
                item
            ): item is DriverInteraction =>
                item !== null
        );
}


export async function
sendDriverEtaBeforeStart(
    assignmentId: string
): Promise<void> {

    if (!assignmentId) {
        throw new Error(
            "Първата фирма не е избрана."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_send_eta_before_start",
            {
                p_order_assignment_id:
                    assignmentId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Известието не можа да бъде изпратено."
        );
    }
}


export async function
sendDriverEtaCurrent(
    stopId: string
): Promise<void> {

    if (!stopId) {
        throw new Error(
            "Текущата спирка не е избрана."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_send_eta_current",
            {
                p_stop_id:
                    stopId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Известието не можа да бъде изпратено."
        );
    }
}


export async function
reportDriverDiscrepancy(
    stopId: string,
    actualLoadedTons: number,
    note: string
): Promise<void> {

    if (!stopId) {
        throw new Error(
            "Текущата спирка не е избрана."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_report_discrepancy",
            {
                p_stop_id:
                    stopId,

                p_actual_loaded_kg:
                    actualTonsToKg(
                        actualLoadedTons
                    ),

                p_note:
                    note.trim() ||
                    null
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Несъответствието не можа да бъде изпратено."
        );
    }
}
