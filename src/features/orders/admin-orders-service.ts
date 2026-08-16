import {
    supabase
} from "../../shared/api/supabase";

import {
    loadFleetSnapshot
} from "../fleet/fleet-service";


const MAX_TRUCK_TONS =
    24;


export type AdminOrderStatus =
    | "pending"
    | "partial"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";


export type AdminOrderAssignmentStatus =
    | "assigned"
    | "accepted"
    | "en_route"
    | "arrived"
    | "loaded"
    | "completed"
    | "cancelled";


export type AdminOrderAssignment = {
    id: string;

    truckId: string;
    tripId: string | null;

    assignedTons: number;
    loadedTons: number | null;

    status:
        AdminOrderAssignmentStatus;

    driverName: string;
    truckNumber: string;
    trailerNumber: string;
    trailerPermit: string | null;

    assignedAt: string;
};


export type AdminOrderLatestLoadingWarning = {
    discrepancyId: string;

    orderAssignmentId: string;

    loadedAt: string;

    assignedTons: number;
    actualLoadedTons: number;
    differenceTons: number;

    note: string | null;

    status:
        | "reported"
        | "reviewed";
};


export type AdminOrderListItem = {
    id: string;
    orderNumber: string;

    companyId: string;
    siteId: string;

    companyName: string;

    siteName: string;
    siteAddress: string;

    siteLatitude: number | null;
    siteLongitude: number | null;

    loadingRamp: boolean;

    requestedTons: number;

    /*
     * Total quantity that is no longer available:
     * completed + currently active assignments.
     *
     * Kept for compatibility with existing calculations.
     */
    assignedTons: number;

    completedTons: number;
    activeAssignedTons: number;

    remainingTons: number;

    status: AdminOrderStatus;

    note: string | null;
    createdAt: string;

    latestLoadingWarning:
        AdminOrderLatestLoadingWarning | null;

    assignments:
        AdminOrderAssignment[];
};


export type ReadyOrderComposition = {
    truckId: string;
    truckNumber: string;

    driverName: string;

    trailerNumber: string;
    trailerPermit: string | null;

    currentLoadTons: number;
    freeTons: number;
};


export type AdminOrdersWorkspace = {
    /*
     * Заявки, по които още може
     * да се прави зачисляване.
     */
    orders:
        AdminOrderListItem[];

    /*
     * Всички operational заявки
     * за картата:
     *
     * pending
     * partial
     * assigned
     * in_progress
     */
    mapOrders:
        AdminOrderListItem[];

    compositions:
        ReadyOrderComposition[];
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


function nullableString(
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

    return Number.isFinite(
        parsed
    )
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

    return Number.isFinite(
        parsed
    )
        ? parsed
        : null;
}


function isOrderStatus(
    value: string
): value is AdminOrderStatus {

    return [
        "pending",
        "partial",
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    ].includes(
        value
    );
}


function isAssignmentStatus(
    value: string
): value is AdminOrderAssignmentStatus {

    return [
        "assigned",
        "accepted",
        "en_route",
        "arrived",
        "loaded",
        "completed",
        "cancelled"
    ].includes(
        value
    );
}


function mapAssignment(
    value: unknown
): AdminOrderAssignment | null {

    if (!isRecord(value)) {
        return null;
    }

    const id =
        stringValue(
            value.id
        );

    const status =
        stringValue(
            value.status
        );

    if (
        !id ||
        !isAssignmentStatus(
            status
        )
    ) {
        return null;
    }

    return {
        id,

        truckId:
            stringValue(
                value.truck_id
            ),

        tripId:
            nullableString(
                value.trip_id
            ),

        assignedTons:
            numberValue(
                value.assigned_tons
            ),

        loadedTons:
            value.loaded_tons === null ||
            value.loaded_tons === undefined

                ? null

                : numberValue(
                    value.loaded_tons
                ),

        status,

        driverName:
            stringValue(
                value.driver_name_snapshot
            ),

        truckNumber:
            stringValue(
                value.truck_number_snapshot
            ),

        trailerNumber:
            stringValue(
                value.trailer_number_snapshot
            ),

        trailerPermit:
            nullableString(
                value.trailer_permit_snapshot
            ),

        assignedAt:
            stringValue(
                value.assigned_at
            )
    };
}


function mapOrder(
    value: unknown
): AdminOrderListItem | null {

    if (!isRecord(value)) {
        return null;
    }

    const id =
        stringValue(
            value.id
        );

    const status =
        stringValue(
            value.status
        );

    if (
        !id ||
        !isOrderStatus(
            status
        )
    ) {
        return null;
    }

    const assignments =
        Array.isArray(
            value.order_assignments
        )

            ? value
                .order_assignments
                .map(
                    mapAssignment
                )
                .filter(
                    (
                        item
                    ): item is AdminOrderAssignment =>
                        item !== null
                )

            : [];


    assignments.sort(
        (
            first,
            second
        ) =>
            new Date(
                first.assignedAt || 0
            ).getTime() -
            new Date(
                second.assignedAt || 0
            ).getTime()
    );


    const requestedTons =
        numberValue(
            value.requested_tons
        );


    const completedTons =
        assignments

            .filter(
                assignment =>
                    assignment.status ===
                        "completed"
            )

            .reduce(
                (
                    total,
                    assignment
                ) =>
                    total +
                    assignment.assignedTons,

                0
            );


    const activeAssignedTons =
        assignments

            .filter(
                assignment =>
                    assignment.status !==
                        "cancelled" &&
                    assignment.status !==
                        "completed"
            )

            .reduce(
                (
                    total,
                    assignment
                ) =>
                    total +
                    assignment.assignedTons,

                0
            );


    const assignedTons =
        completedTons +
        activeAssignedTons;


    return {
        id,

        orderNumber:
            stringValue(
                value.order_number
            ),

        companyId:
            stringValue(
                value.company_id
            ),

        siteId:
            stringValue(
                value.site_id
            ),

        companyName:
            stringValue(
                value.company_name_snapshot
            ),

        siteName:
            stringValue(
                value.site_name_snapshot
            ),

        siteAddress:
            stringValue(
                value.site_address_snapshot
            ),

        siteLatitude:
            nullableNumber(
                value.site_latitude_snapshot
            ),

        siteLongitude:
            nullableNumber(
                value.site_longitude_snapshot
            ),

        loadingRamp:
            value.loading_ramp_snapshot ===
            true,

        requestedTons,

        assignedTons,

        completedTons,

        activeAssignedTons,

        remainingTons:
            Math.max(
                requestedTons -
                    assignedTons,
                0
            ),

        status,

        note:
            nullableString(
                value.note
            ),

        createdAt:
            stringValue(
                value.created_at
            ),

        latestLoadingWarning:
            null,

        assignments
    };
}


async function
loadAdminOperationalOrders():
Promise<AdminOrderListItem[]> {

    const {
        data,
        error
    } =
        await supabase
            .from(
                "orders"
            )
            .select(
                `
                id,
                order_number,
                company_id,
                site_id,
                company_name_snapshot,
                site_name_snapshot,
                site_address_snapshot,
                site_latitude_snapshot,
                site_longitude_snapshot,
                loading_ramp_snapshot,
                requested_tons,
                status,
                note,
                created_at,
                order_assignments (
                    id,
                    truck_id,
                    trip_id,
                    assigned_tons,
                    loaded_tons,
                    status,
                    driver_name_snapshot,
                    truck_number_snapshot,
                    trailer_number_snapshot,
                    trailer_permit_snapshot,
                    assigned_at
                )
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


    return (
        data || []
    )
        .map(
            mapOrder
        )
        .filter(
            (
                item
            ): item is AdminOrderListItem =>
                item !== null
        );
}


export async function
loadAdminActiveOrders():
Promise<AdminOrderListItem[]> {

    const operationalOrders =
        await loadAdminOperationalOrders();


    return operationalOrders.filter(
        order =>
            order.status !==
                "in_progress" &&
            order.remainingTons >
                0
    );
}


async function
loadLatestLoadingWarnings(
    orders:
        AdminOrderListItem[]
): Promise<
    Map<
        string,
        AdminOrderLatestLoadingWarning
    >
> {

    const result =
        new Map<
            string,
            AdminOrderLatestLoadingWarning
        >();


    if (
        orders.length ===
        0
    ) {
        return result;
    }


    const orderIds =
        orders.map(
            order =>
                order.id
        );


    const stopResult =
        await supabase
            .from(
                "trip_stops"
            )
            .select(
                `
                order_id,
                order_assignment_id,
                loaded_at
                `
            )
            .in(
                "order_id",
                orderIds
            )
            .not(
                "loaded_at",
                "is",
                null
            )
            .order(
                "loaded_at",
                {
                    ascending:
                        false
                }
            );


    if (
        stopResult.error
    ) {

        throw new Error(
            stopResult.error.message ||
            "Последните товарения не можаха да бъдат заредени."
        );
    }


    type LatestStop = {
        orderId: string;
        orderAssignmentId: string;
        loadedAt: string;
    };


    const latestByOrder =
        new Map<
            string,
            LatestStop
        >();


    for (
        const row
        of stopResult.data || []
    ) {

        if (!isRecord(row)) {
            continue;
        }


        const orderId =
            stringValue(
                row.order_id
            );

        const orderAssignmentId =
            stringValue(
                row.order_assignment_id
            );

        const loadedAt =
            stringValue(
                row.loaded_at
            );


        if (
            !orderId ||
            !orderAssignmentId ||
            !loadedAt ||
            latestByOrder.has(
                orderId
            )
        ) {
            continue;
        }


        latestByOrder.set(
            orderId,
            {
                orderId,
                orderAssignmentId,
                loadedAt
            }
        );
    }


    const assignmentIds =
        Array.from(
            new Set(
                Array.from(
                    latestByOrder.values()
                ).map(
                    stop =>
                        stop.orderAssignmentId
                )
            )
        );


    if (
        assignmentIds.length ===
        0
    ) {
        return result;
    }


    const discrepancyResult =
        await supabase
            .from(
                "discrepancies"
            )
            .select(
                `
                id,
                order_assignment_id,
                assigned_tons_snapshot,
                actual_loaded_tons,
                difference_tons,
                note,
                status,
                created_at
                `
            )
            .in(
                "order_assignment_id",
                assignmentIds
            )
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


    if (
        discrepancyResult.error
    ) {

        throw new Error(
            discrepancyResult.error.message ||
            "Несъответствията при последните товарения не можаха да бъдат заредени."
        );
    }


    type DiscrepancyCandidate = {
        discrepancyId: string;

        orderAssignmentId: string;

        assignedTons: number;
        actualLoadedTons: number;
        differenceTons: number;

        note: string | null;

        status:
            | "reported"
            | "reviewed";
    };


    const discrepancyByAssignment =
        new Map<
            string,
            DiscrepancyCandidate
        >();


    for (
        const row
        of discrepancyResult.data ||
        []
    ) {

        if (!isRecord(row)) {
            continue;
        }


        const discrepancyId =
            stringValue(
                row.id
            );

        const orderAssignmentId =
            stringValue(
                row.order_assignment_id
            );

        const status =
            stringValue(
                row.status
            );


        if (
            !discrepancyId ||
            !orderAssignmentId ||
            (
                status !==
                    "reported" &&
                status !==
                    "reviewed"
            ) ||
            discrepancyByAssignment.has(
                orderAssignmentId
            )
        ) {
            continue;
        }


        discrepancyByAssignment.set(
            orderAssignmentId,
            {
                discrepancyId,

                orderAssignmentId,

                assignedTons:
                    numberValue(
                        row.assigned_tons_snapshot
                    ),

                actualLoadedTons:
                    numberValue(
                        row.actual_loaded_tons
                    ),

                differenceTons:
                    numberValue(
                        row.difference_tons
                    ),

                note:
                    nullableString(
                        row.note
                    ),

                status
            }
        );
    }


    for (
        const [
            orderId,
            stop
        ]
        of latestByOrder
    ) {

        const discrepancy =
            discrepancyByAssignment.get(
                stop.orderAssignmentId
            );


        /*
         * Критично правило:
         *
         * гледаме САМО последния
         * реално loaded trip_stop.
         *
         * Ако той няма discrepancy,
         * старо предупреждение НЕ се
         * наследява.
         */
        if (!discrepancy) {
            continue;
        }


        result.set(
            orderId,
            {
                ...discrepancy,

                loadedAt:
                    stop.loadedAt
            }
        );
    }


    return result;
}


async function
loadReadyOrderCompositions():
Promise<ReadyOrderComposition[]> {

    const [
        snapshot,
        loadResult
    ] =
        await Promise.all([

            loadFleetSnapshot(),

            supabase
                .from(
                    "order_assignments"
                )
                .select(
                    "truck_id, assigned_tons, status"
                )
                .in(
                    "status",
                    [
                        "assigned",
                        "accepted",
                        "en_route",
                        "arrived",
                        "loaded"
                    ]
                )
        ]);


    if (loadResult.error) {

        throw new Error(
            loadResult.error.message ||
            "Свободният капацитет на камионите не можа да бъде зареден."
        );
    }


    const loadByTruck =
        new Map<
            string,
            number
        >();


    for (
        const row
        of loadResult.data || []
    ) {

        if (!isRecord(row)) {
            continue;
        }

        const truckId =
            stringValue(
                row.truck_id
            );

        if (!truckId) {
            continue;
        }

        loadByTruck.set(
            truckId,

            (
                loadByTruck.get(
                    truckId
                ) || 0
            ) +
            numberValue(
                row.assigned_tons
            )
        );
    }


    const result:
        ReadyOrderComposition[] =
        [];


    for (
        const truck
        of snapshot.trucks
    ) {

        if (
            snapshot
                .lockedTruckIds
                .includes(
                    truck.id
                )
        ) {
            continue;
        }


        const assignment =
            snapshot
                .activeAssignments
                .find(
                    item =>
                        item.truckId ===
                        truck.id
                );


        if (
            !assignment ||
            assignment.assignmentMode !==
                "permanent" ||
            !assignment.driverId ||
            !assignment.trailerId
        ) {
            continue;
        }


        const driver =
            snapshot
                .drivers
                .find(
                    item =>
                        item.id ===
                        assignment.driverId
                );


        const trailer =
            snapshot
                .trailers
                .find(
                    item =>
                        item.id ===
                        assignment.trailerId
                );


        if (
            !driver ||
            !trailer
        ) {
            continue;
        }


        const currentLoadTons =
            loadByTruck.get(
                truck.id
            ) || 0;


        const freeTons =
            Math.max(
                MAX_TRUCK_TONS -
                    currentLoadTons,
                0
            );


        if (
            freeTons <=
            0
        ) {
            continue;
        }


        result.push({
            truckId:
                truck.id,

            truckNumber:
                truck.registrationNumber,

            driverName:
                driver.name,

            trailerNumber:
                trailer.registrationNumber,

            trailerPermit:
                trailer.permitNumber,

            currentLoadTons,

            freeTons
        });
    }


    result.sort(
        (
            first,
            second
        ) =>
            first
                .truckNumber
                .localeCompare(
                    second.truckNumber,
                    "bg"
                )
    );


    return result;
}


export async function
loadAdminOrdersWorkspace():
Promise<AdminOrdersWorkspace> {

    const [
        rawMapOrders,
        compositions
    ] =
        await Promise.all([
            loadAdminOperationalOrders(),
            loadReadyOrderCompositions()
        ]);


    /*
     * Warning-ът е вторична информация.
     * Ако четенето му се провали,
     * не блокираме основната работа
     * по зачисляване на заявки.
     */
    const warningByOrder =
        await loadLatestLoadingWarnings(
            rawMapOrders
        )
            .catch(
                error => {

                    console.error(
                        "Latest loading warnings could not be loaded.",
                        error
                    );


                    return new Map<
                        string,
                        AdminOrderLatestLoadingWarning
                    >();
                }
            );


    const mapOrders =
        rawMapOrders.map(
            order => ({
                ...order,

                latestLoadingWarning:
                    warningByOrder.get(
                        order.id
                    ) ||
                    null
            })
        );


    const orders =
        mapOrders.filter(
            order =>
                order.status !==
                    "in_progress" &&
                order.remainingTons >
                    0
        );


    return {
        orders,
        mapOrders,
        compositions
    };
}


function tonsToKg(
    tons: number
): number {

    if (
        !Number.isFinite(
            tons
        ) ||
        tons <=
            0
    ) {

        throw new Error(
            "Въведете валиден тонаж."
        );
    }


    const kg =
        Math.round(
            tons *
            1000
        );


    if (
        kg <=
        0
    ) {

        throw new Error(
            "Въведете валиден тонаж."
        );
    }


    return kg;
}


export async function
assignOrderLoad(
    orderId: string,
    truckId: string,
    tons: number
): Promise<string> {

    const assignedKg =
        tonsToKg(
            tons
        );


    const {
        data,
        error
    } =
        await supabase.rpc(
            "orders_assign_load",
            {
                p_order_id:
                    orderId,

                p_truck_id:
                    truckId,

                p_assigned_kg:
                    assignedKg
            }
        );


    if (error) {

        throw new Error(
            error.message ||
            "Товарът не можа да бъде зачислен."
        );
    }


    if (
        typeof data !==
            "string" ||
        !data
    ) {

        throw new Error(
            "Товарът беше зачислен, но липсва идентификаторът на зачисляването."
        );
    }


    return data;
}



export async function
cancelOrderAssignment(
    assignmentId: string
): Promise<void> {

    if (!assignmentId) {

        throw new Error(
            "Зачисляването не е избрано."
        );
    }


    const {
        error
    } =
        await supabase.rpc(
            "orders_cancel_assignment",
            {
                p_assignment_id:
                    assignmentId
            }
        );


    if (error) {

        throw new Error(
            error.message ||
            "Зачисляването не можа да бъде отменено."
        );
    }
}
