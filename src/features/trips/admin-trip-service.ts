import {
    supabase
} from "../../shared/api/supabase";


export type AdminTripStopStatus =
    | "waiting"
    | "en_route"
    | "loaded";


export type AdminTripMoveDirection =
    | "up"
    | "down";


export type AdminTripInsertMode =
    | "next"
    | "last";


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


export type AdminAvailableOrder = {
    id: string;

    orderNumber: string;

    companyId: string;
    companyName: string;

    siteId: string;
    siteName: string;

    address: string;

    requestedTons: number;
    remainingTons: number;

    note: string | null;
};


type JsonRecord =
    Record<string, unknown>;


/* =========================================================
   HELPERS
   ========================================================= */


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


function tonsToKg(
    tons: number
): number {

    if (
        !Number.isFinite(tons) ||
        tons <= 0
    ) {
        throw new Error(
            "Въведете валиден тонаж."
        );
    }


    const kg =
        Math.round(
            tons * 1000
        );


    if (kg <= 0) {
        throw new Error(
            "Тонажът трябва да бъде по-голям от 0."
        );
    }


    return kg;
}


/* =========================================================
   MAPPING
   ========================================================= */


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


function mapAvailableOrder(
    value: unknown
): AdminAvailableOrder | null {

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

        orderNumber:
            textValue(
                value.orderNumber
            ),

        companyId:
            textValue(
                value.companyId
            ),

        companyName:
            textValue(
                value.companyName
            ),

        siteId:
            textValue(
                value.siteId
            ),

        siteName:
            textValue(
                value.siteName
            ),

        address:
            textValue(
                value.address
            ),

        requestedTons:
            numberValue(
                value.requestedTons
            ),

        remainingTons:
            numberValue(
                value.remainingTons
            ),

        note:
            nullableText(
                value.note
            )
    };
}


/* =========================================================
   READ ACTIVE TRIPS
   ========================================================= */


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


/* =========================================================
   AVAILABLE ORDERS
   ========================================================= */


export async function
loadAdminAvailableOrders(
    tripId: string
): Promise<AdminAvailableOrder[]> {

    if (!tripId) {
        throw new Error(
            "Курсът не е избран."
        );
    }


    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_admin_get_available_orders",
            {
                p_trip_id:
                    tripId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Свободните заявки не можаха да бъдат заредени."
        );
    }


    if (!Array.isArray(data)) {
        return [];
    }


    return data
        .map(
            mapAvailableOrder
        )
        .filter(
            (
                order
            ): order is AdminAvailableOrder =>
                order !== null
        );
}


/* =========================================================
   MOVE FUTURE STOP
   ========================================================= */


export async function
moveAdminFutureStop(
    stopId: string,
    direction:
        AdminTripMoveDirection
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
            "trips_admin_move_future_stop",
            {
                p_stop_id:
                    stopId,

                p_direction:
                    direction
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Спирката не можа да бъде преместена."
        );
    }
}


/* =========================================================
   UPDATE TONS
   ========================================================= */


export async function
updateAdminStopLoad(
    stopId: string,
    assignedTons: number
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
            "trips_admin_update_stop_load",
            {
                p_stop_id:
                    stopId,

                p_assigned_kg:
                    tonsToKg(
                        assignedTons
                    )
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Тонажът не можа да бъде променен."
        );
    }
}


/* =========================================================
   REMOVE FUTURE STOP
   ========================================================= */


export async function
removeAdminFutureStop(
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
            "trips_admin_remove_future_stop",
            {
                p_stop_id:
                    stopId
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Спирката не можа да бъде премахната."
        );
    }
}


/* =========================================================
   ADD ORDER TO ACTIVE TRIP
   ========================================================= */


export async function
addAdminOrderToTrip(
    tripId: string,
    orderId: string,
    assignedTons: number,
    insertMode:
        AdminTripInsertMode
): Promise<void> {

    if (!tripId) {
        throw new Error(
            "Курсът не е избран."
        );
    }


    if (!orderId) {
        throw new Error(
            "Заявката не е избрана."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "trips_admin_add_order",
            {
                p_trip_id:
                    tripId,

                p_order_id:
                    orderId,

                p_assigned_kg:
                    tonsToKg(
                        assignedTons
                    ),

                p_insert_mode:
                    insertMode
            }
        );


    if (error) {
        throw new Error(
            error.message ||
            "Заявката не можа да бъде добавена към курса."
        );
    }
}
