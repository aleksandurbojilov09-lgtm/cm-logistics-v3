import {
    supabase
} from "../../shared/api/supabase";


export type DriverStopStatus =
    | "assigned"
    | "waiting"
    | "en_route"
    | "loaded";


export type DriverStop = {
    id: string | null;
    assignmentId: string | null;
    orderId: string;
    orderNumber: string;
    stopNumber: number | null;

    companyName: string;
    siteName: string;
    address: string;

    contactPerson: string | null;
    phone: string | null;

    latitude: number | null;
    longitude: number | null;

    assignedTons: number;
    note: string | null;

    status: DriverStopStatus;

    etaNotifiedAt: string | null;
    loadedAt: string | null;
};


export type DriverComposition = {
    vehicleAssignmentId: string;
    truckId: string;
    truckNumber: string;
    trailerId: string;
    trailerNumber: string;
    positionNumber: string | null;
};


export type DriverActiveSegment = {
    id: string;
    segmentNumber: number;
    startKm: number;
    startedAt: string;

    driverName: string;
    truckNumber: string;
    trailerNumber: string | null;
    positionNumber: string | null;
};


export type DriverActiveTrip = {
    id: string;
    tripNumber: string;
    status: string;
    startedAt: string;

    activeSegment:
        DriverActiveSegment | null;

    stops:
        DriverStop[];
};


export type DriverTripState = {
    driverId: string;
    driverName: string;

    hasActiveTrip: boolean;

    composition:
        DriverComposition | null;

    assignedStops:
        DriverStop[];

    trip:
        DriverActiveTrip | null;
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


function stopStatus(
    value: unknown,
    fallback:
        DriverStopStatus
): DriverStopStatus {

    const status =
        textValue(value);


    if (
        status === "waiting" ||
        status === "en_route" ||
        status === "loaded" ||
        status === "assigned"
    ) {
        return status;
    }


    return fallback;
}


function mapAssignedStop(
    value: unknown
): DriverStop | null {

    if (!isRecord(value)) {
        return null;
    }


    const orderId =
        textValue(
            value.orderId
        );


    if (!orderId) {
        return null;
    }


    return {
        id:
            null,

        assignmentId:
            nullableText(
                value.assignmentId
            ),

        orderId,

        orderNumber:
            textValue(
                value.orderNumber
            ),

        stopNumber:
            null,

        companyName:
            textValue(
                value.companyName
            ),

        siteName:
            textValue(
                value.siteName
            ),

        address:
            textValue(
                value.address
            ),

        contactPerson:
            nullableText(
                value.contactPerson
            ),

        phone:
            nullableText(
                value.phone
            ),

        latitude:
            nullableNumber(
                value.latitude
            ),

        longitude:
            nullableNumber(
                value.longitude
            ),

        assignedTons:
            numberValue(
                value.assignedTons
            ),

        note:
            nullableText(
                value.note
            ),

        status:
            "assigned",

        etaNotifiedAt:
            null,

        loadedAt:
            null
    };
}


function mapTripStop(
    value: unknown
): DriverStop | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        textValue(
            value.id
        );


    const orderId =
        textValue(
            value.orderId
        );


    if (
        !id ||
        !orderId
    ) {
        return null;
    }


    return {
        id,

        assignmentId:
            null,

        orderId,

        orderNumber:
            textValue(
                value.orderNumber
            ),

        stopNumber:
            numberValue(
                value.stopNumber
            ),

        companyName:
            textValue(
                value.companyName
            ),

        siteName:
            textValue(
                value.siteName
            ),

        address:
            textValue(
                value.address
            ),

        contactPerson:
            nullableText(
                value.contactPerson
            ),

        phone:
            nullableText(
                value.phone
            ),

        latitude:
            nullableNumber(
                value.latitude
            ),

        longitude:
            nullableNumber(
                value.longitude
            ),

        assignedTons:
            numberValue(
                value.assignedTons
            ),

        note:
            nullableText(
                value.note
            ),

        status:
            stopStatus(
                value.status,
                "waiting"
            ),

        etaNotifiedAt:
            nullableText(
                value.etaNotifiedAt
            ),

        loadedAt:
            nullableText(
                value.loadedAt
            )
    };
}


function mapComposition(
    value: unknown
): DriverComposition | null {

    if (!isRecord(value)) {
        return null;
    }


    const vehicleAssignmentId =
        textValue(
            value.vehicleAssignmentId
        );


    const truckId =
        textValue(
            value.truckId
        );


    const trailerId =
        textValue(
            value.trailerId
        );


    if (
        !vehicleAssignmentId ||
        !truckId ||
        !trailerId
    ) {
        return null;
    }


    return {
        vehicleAssignmentId,

        truckId,

        truckNumber:
            textValue(
                value.truckNumber
            ),

        trailerId,

        trailerNumber:
            textValue(
                value.trailerNumber
            ),

        positionNumber:
            nullableText(
                value.positionNumber
            )
    };
}


function mapActiveSegment(
    value: unknown
): DriverActiveSegment | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        textValue(
            value.id
        );


    if (!id) {
        return null;
    }


    return {
        id,

        segmentNumber:
            numberValue(
                value.segmentNumber
            ),

        startKm:
            numberValue(
                value.startKm
            ),

        startedAt:
            textValue(
                value.startedAt
            ),

        driverName:
            textValue(
                value.driverName
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
            )
    };
}


function mapActiveTrip(
    value: unknown
): DriverActiveTrip | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        textValue(
            value.id
        );


    if (!id) {
        return null;
    }


    const stops =
        Array.isArray(
            value.stops
        )
            ? value.stops
                .map(
                    mapTripStop
                )
                .filter(
                    (
                        stop
                    ): stop is DriverStop =>
                        stop !== null
                )
            : [];


    stops.sort(
        (
            first,
            second
        ) =>
            (
                first.stopNumber || 0
            ) -
            (
                second.stopNumber || 0
            )
    );


    return {
        id,

        tripNumber:
            textValue(
                value.tripNumber
            ),

        status:
            textValue(
                value.status
            ),

        startedAt:
            textValue(
                value.startedAt
            ),

        activeSegment:
            mapActiveSegment(
                value.activeSegment
            ),

        stops
    };
}


function mapDriverState(
    value: unknown
): DriverTripState {

    if (!isRecord(value)) {
        throw new Error(
            "Невалидни данни за курса."
        );
    }


    const driverId =
        textValue(
            value.driverId
        );


    if (!driverId) {
        throw new Error(
            "Липсва шофьор в състоянието на курса."
        );
    }


    const assignedStops =
        Array.isArray(
            value.assignedStops
        )
            ? value.assignedStops
                .map(
                    mapAssignedStop
                )
                .filter(
                    (
                        stop
                    ): stop is DriverStop =>
                        stop !== null
                )
            : [];


    return {
        driverId,

        driverName:
            textValue(
                value.driverName
            ),

        hasActiveTrip:
            value.hasActiveTrip ===
                true,

        composition:
            mapComposition(
                value.composition
            ),

        assignedStops,

        trip:
            mapActiveTrip(
                value.trip
            )
    };
}


function positiveOdometer(
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
loadDriverTripState():
Promise<DriverTripState> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_get_driver_state"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Курсът не можа да бъде зареден."
        );
    }


    return mapDriverState(
        data
    );
}


export async function
startDriverTrip(
    startKm: number
): Promise<void> {

    const {
        error
    } =
        await supabase.rpc(
            "trips_start_driver",
            {
                p_start_km:
                    positiveOdometer(
                        startKm
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Курсът не можа да бъде стартиран."
        );
    }
}


export async function
markDriverStopLoaded(
    stopId: string
): Promise<void> {

    if (!stopId) {
        throw new Error(
            "Спирката не е избрана."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_mark_stop_loaded",
            {
                p_stop_id:
                    stopId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Спирката не можа да бъде приключена."
        );
    }
}


export async function
finishDriverTrip(
    endKm: number,
    officialUnloadedKg: number
): Promise<void> {

    if (
        !Number.isFinite(
            officialUnloadedKg
        ) ||
        officialUnloadedKg <= 0 ||
        officialUnloadedKg > 99999 ||
        !Number.isInteger(
            officialUnloadedKg
        )
    ) {
        throw new Error(
            "Официалното тегло трябва да е между 1 и 99 999 кг."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_finish_driver",
            {
                p_end_km:
                    positiveOdometer(
                        endKm
                    ),

                p_official_unloaded_kg:
                    officialUnloadedKg
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Курсът не можа да бъде приключен."
        );
    }
}
