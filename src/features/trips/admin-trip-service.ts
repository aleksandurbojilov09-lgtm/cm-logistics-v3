import {
    supabase
} from "../../shared/api/supabase";


export type AdminTripStopStatus =
    | "waiting"
    | "en_route"
    | "loaded";


export type AdminActiveTripStop = {
    id: string;

    stopNumber: number;

    orderAssignmentId: string;
    orderId: string;

    companyId: string;
    siteId: string;

    orderNumber: string;

    companyName: string;
    siteName: string;
    address: string;

    contactPerson: string | null;
    phone: string | null;

    latitude: number | null;
    longitude: number | null;

    assignedTons: number;

    note: string | null;

    status:
        AdminTripStopStatus;

    etaNotifiedAt:
        string | null;

    loadedAt:
        string | null;
};


export type AdminActiveTripSegment = {
    id: string;

    segmentNumber: number;

    vehicleAssignmentId: string;

    driverId: string;

    truckId: string;

    trailerId: string | null;

    driverName: string;

    truckNumber: string;

    trailerNumber:
        string | null;

    positionNumber:
        string | null;

    startKm: number;

    startedAt: string;
};


export type AdminActiveTrip = {
    id: string;

    tripNumber: string;

    primaryDriverId: string;

    status: string;

    startedAt: string;

    note: string | null;

    activeSegment:
        AdminActiveTripSegment | null;

    stops:
        AdminActiveTripStop[];
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


function mapStop(
    value: unknown
): AdminActiveTripStop | null {

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
            status !== "waiting" &&
            status !== "en_route" &&
            status !== "loaded"
        )
    ) {
        return null;
    }


    return {
        id,

        stopNumber:
            numberValue(
                value.stopNumber
            ),

        orderAssignmentId:
            textValue(
                value.orderAssignmentId
            ),

        orderId:
            textValue(
                value.orderId
            ),

        companyId:
            textValue(
                value.companyId
            ),

        siteId:
            textValue(
                value.siteId
            ),

        orderNumber:
            textValue(
                value.orderNumber
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

        status,

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


function mapSegment(
    value: unknown
): AdminActiveTripSegment | null {

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

        vehicleAssignmentId:
            textValue(
                value.vehicleAssignmentId
            ),

        driverId:
            textValue(
                value.driverId
            ),

        truckId:
            textValue(
                value.truckId
            ),

        trailerId:
            nullableText(
                value.trailerId
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
            ),

        startKm:
            numberValue(
                value.startKm
            ),

        startedAt:
            textValue(
                value.startedAt
            )
    };
}


function mapTrip(
    value: unknown
): AdminActiveTrip | null {

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
                    mapStop
                )
                .filter(
                    (
                        stop
                    ): stop is AdminActiveTripStop =>
                        stop !== null
                )
            : [];


    stops.sort(
        (
            first,
            second
        ) =>
            first.stopNumber -
            second.stopNumber
    );


    return {
        id,

        tripNumber:
            textValue(
                value.tripNumber
            ),

        primaryDriverId:
            textValue(
                value.primaryDriverId
            ),

        status:
            textValue(
                value.status
            ),

        startedAt:
            textValue(
                value.startedAt
            ),

        note:
            nullableText(
                value.note
            ),

        activeSegment:
            mapSegment(
                value.activeSegment
            ),

        stops
    };
}


export async function
loadAdminActiveTrips():
Promise<AdminActiveTrip[]> {

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_admin_get_active"
        );


    if (error) {
        throw new Error(
            error.message ||
            "Активните курсове не можаха да бъдат заредени."
        );
    }


    if (!Array.isArray(data)) {
        return [];
    }


    return data
        .map(
            mapTrip
        )
        .filter(
            (
                trip
            ): trip is AdminActiveTrip =>
                trip !== null
        );
}
