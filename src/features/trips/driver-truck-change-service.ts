import {
    supabase
} from "../../shared/api/supabase";


export type DriverTruckChangeMode =
    | "temporary_for_trip"
    | "permanent";


export type DriverTruckChange = {
    id: string;
    tripId: string;
    status: string;

    changeMode:
        DriverTruckChangeMode;

    driverName: string;

    fromTruckId: string;
    fromTruckNumber: string;

    toTruckId: string;
    toTruckNumber: string;

    trailerId: string | null;
    trailerNumber: string | null;
    positionNumber: string | null;

    requestedAt: string | null;
    segmentStartKm: number;
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

    return typeof value === "string"
        ? value
        : "";
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


function mapTruckChange(
    value: unknown
): DriverTruckChange | null {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (!isRecord(value)) {
        throw new Error(
            "Невалидни данни за смяната на камион."
        );
    }

    const id =
        textValue(value.id);

    const tripId =
        textValue(value.tripId);

    if (
        !id ||
        !tripId
    ) {
        return null;
    }

    return {
        id,
        tripId,

        status:
            textValue(value.status),

        changeMode:
            value.changeMode ===
                "permanent"
                ? "permanent"
                : "temporary_for_trip",

        driverName:
            textValue(value.driverName),

        fromTruckId:
            textValue(value.fromTruckId),

        fromTruckNumber:
            textValue(value.fromTruckNumber),

        toTruckId:
            textValue(value.toTruckId),

        toTruckNumber:
            textValue(value.toTruckNumber),

        trailerId:
            nullableText(value.trailerId),

        trailerNumber:
            nullableText(
                value.trailerNumber
            ),

        positionNumber:
            nullableText(
                value.positionNumber
            ),

        requestedAt:
            nullableText(
                value.requestedAt
            ),

        segmentStartKm:
            numberValue(
                value.segmentStartKm
            )
    };
}


function validOdometer(
    value: number
): number {

    if (
        !Number.isFinite(value) ||
        value < 0 ||
        !Number.isInteger(value)
    ) {
        throw new Error(
            "Километражът трябва да бъде цяло положително число."
        );
    }

    return value;
}


export async function
loadDriverTruckChange():
Promise<DriverTruckChange | null> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_get_driver_truck_change"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Смяната на камион не можа да бъде проверена."
        );
    }

    return mapTruckChange(
        data
    );
}


export async function
confirmDriverTruckChange(
    requestId: string,
    oldTruckEndKm: number,
    newTruckStartKm: number
): Promise<void> {

    if (!requestId) {
        throw new Error(
            "Липсва заявка за смяна."
        );
    }

    const {
        error
    } =
        await supabase.rpc(
            "trips_driver_confirm_truck_change",
            {
                p_request_id:
                    requestId,

                p_old_truck_end_km:
                    validOdometer(
                        oldTruckEndKm
                    ),

                p_new_truck_start_km:
                    validOdometer(
                        newTruckStartKm
                    )
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Смяната на камион не можа да бъде потвърдена."
        );
    }
}
