import {
    supabase
} from "../../shared/api/supabase";


export type DriverHandoffCandidate = {
    driverId: string;
    driverName: string;
    employeeCode: string | null;
    currentTruckNumber: string | null;
};


export type DriverHandoffRequest = {
    requestId: string;

    tripId: string;
    tripNumber: string;

    fromDriverId: string;
    fromDriverName: string;

    toDriverId: string;
    toDriverName: string;

    truckNumber: string;
    trailerNumber: string | null;
    positionNumber: string | null;

    handoffKm: number;

    status: string;

    requestedAt: string | null;
};


export type DriverHandoffState = {
    outgoing:
        DriverHandoffRequest | null;

    incoming:
        DriverHandoffRequest | null;
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
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return String(value);
    }

    return "";
}


function nullableText(
    value: unknown
): string | null {

    const result =
        textValue(value).trim();

    return result
        ? result
        : null;
}


function numberValue(
    value: unknown
): number {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function validId(
    value: string,
    message: string
): string {

    const result =
        value.trim();

    if (!result) {
        throw new Error(
            message
        );
    }

    return result;
}


function validOdometer(
    value: number
): number {

    if (
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < 0
    ) {
        throw new Error(
            "Въведи валиден междинен километраж."
        );
    }

    return value;
}


function mapCandidate(
    value: unknown
): DriverHandoffCandidate | null {

    if (!isRecord(value)) {
        return null;
    }


    const driverId =
        textValue(
            value.driverId
        );

    const driverName =
        textValue(
            value.driverName
        );


    if (
        !driverId ||
        !driverName
    ) {
        return null;
    }


    return {
        driverId,

        driverName,

        employeeCode:
            nullableText(
                value.employeeCode
            ),

        currentTruckNumber:
            nullableText(
                value.currentTruckNumber
            )
    };
}


function mapRequest(
    value: unknown
): DriverHandoffRequest | null {

    if (!isRecord(value)) {
        return null;
    }


    const requestId =
        textValue(
            value.requestId
        );

    const tripId =
        textValue(
            value.tripId
        );


    if (
        !requestId ||
        !tripId
    ) {
        return null;
    }


    return {
        requestId,

        tripId,

        tripNumber:
            textValue(
                value.tripNumber
            ),

        fromDriverId:
            textValue(
                value.fromDriverId
            ),

        fromDriverName:
            textValue(
                value.fromDriverName
            ),

        toDriverId:
            textValue(
                value.toDriverId
            ),

        toDriverName:
            textValue(
                value.toDriverName
            ),

        truckNumber:
            textValue(
                value.truckNumber
            ),

        trailerNumber:
            nullableText(
                value.trailerNumber
            ),

        positionNumber:
            nullableText(
                value.positionNumber
            ),

        handoffKm:
            numberValue(
                value.handoffKm
            ),

        status:
            textValue(
                value.status
            ),

        requestedAt:
            nullableText(
                value.requestedAt
            )
    };
}


export async function
loadDriverHandoffState():
Promise<DriverHandoffState> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_get_driver_handoff_state"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Предаването на курса не можа да бъде проверено."
        );
    }


    if (!isRecord(data)) {
        return {
            outgoing: null,
            incoming: null
        };
    }


    return {
        outgoing:
            mapRequest(
                data.outgoing
            ),

        incoming:
            mapRequest(
                data.incoming
            )
    };
}


export async function
loadDriverHandoffCandidates():
Promise<DriverHandoffCandidate[]> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_list_driver_handoff_candidates"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Шофьорите не можаха да бъдат заредени."
        );
    }


    if (!Array.isArray(data)) {
        return [];
    }


    return data
        .map(
            mapCandidate
        )
        .filter(
            (
                item
            ): item is DriverHandoffCandidate =>
                item !== null
        );
}


export async function
requestDriverHandoff(
    toDriverId: string,
    handoffKm: number
): Promise<void> {

    const {
        error
    } =
        await supabase.rpc(
            "trips_request_driver_handoff",
            {
                p_to_driver_id:
                    validId(
                        toDriverId,
                        "Избери шофьор."
                    ),

                p_handoff_km:
                    validOdometer(
                        handoffKm
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Курсът не можа да бъде изпратен за предаване."
        );
    }
}


export async function
cancelDriverHandoff(
    requestId: string
): Promise<void> {

    const {
        error
    } =
        await supabase.rpc(
            "trips_cancel_driver_handoff",
            {
                p_request_id:
                    validId(
                        requestId,
                        "Липсва заявка за предаване."
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Предаването не можа да бъде отменено."
        );
    }
}


export async function
rejectDriverHandoff(
    requestId: string
): Promise<void> {

    const {
        error
    } =
        await supabase.rpc(
            "trips_reject_driver_handoff",
            {
                p_request_id:
                    validId(
                        requestId,
                        "Липсва заявка за предаване."
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Предаването не можа да бъде отказано."
        );
    }
}


export async function
acceptDriverHandoff(
    requestId: string
): Promise<void> {

    const {
        error
    } =
        await supabase.rpc(
            "trips_accept_driver_handoff",
            {
                p_request_id:
                    validId(
                        requestId,
                        "Липсва заявка за предаване."
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Курсът не можа да бъде приет."
        );
    }
}
