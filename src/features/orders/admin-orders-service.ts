import { supabase } from "../../shared/api/supabase";
import { loadFleetSnapshot } from "../fleet/fleet-service";

const MAX_TRUCK_TONS = 24;

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
    assignedTons: number;
    loadedTons: number | null;
    status: AdminOrderAssignmentStatus;
    driverName: string;
    truckNumber: string;
    trailerNumber: string;
    trailerPermit: string | null;
    assignedAt: string;
};

export type AdminOrderListItem = {
    id: string;
    orderNumber: string;
    companyName: string;
    siteName: string;
    siteAddress: string;
    requestedTons: number;
    assignedTons: number;
    remainingTons: number;
    status: AdminOrderStatus;
    note: string | null;
    createdAt: string;
    assignments: AdminOrderAssignment[];
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
    orders: AdminOrderListItem[];
    compositions: ReadyOrderComposition[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
}

function nullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isOrderStatus(value: string): value is AdminOrderStatus {
    return [
        "pending",
        "partial",
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    ].includes(value);
}

function isAssignmentStatus(value: string): value is AdminOrderAssignmentStatus {
    return [
        "assigned",
        "accepted",
        "en_route",
        "arrived",
        "loaded",
        "completed",
        "cancelled"
    ].includes(value);
}

function mapAssignment(value: unknown): AdminOrderAssignment | null {
    if (!isRecord(value)) return null;

    const id = stringValue(value.id);
    const status = stringValue(value.status);

    if (!id || !isAssignmentStatus(status)) return null;

    return {
        id,
        assignedTons: numberValue(value.assigned_tons),
        loadedTons:
            value.loaded_tons === null || value.loaded_tons === undefined
                ? null
                : numberValue(value.loaded_tons),
        status,
        driverName: stringValue(value.driver_name_snapshot),
        truckNumber: stringValue(value.truck_number_snapshot),
        trailerNumber: stringValue(value.trailer_number_snapshot),
        trailerPermit: nullableString(value.trailer_permit_snapshot),
        assignedAt: stringValue(value.assigned_at)
    };
}

function mapOrder(value: unknown): AdminOrderListItem | null {
    if (!isRecord(value)) return null;

    const id = stringValue(value.id);
    const status = stringValue(value.status);

    if (!id || !isOrderStatus(status)) return null;

    const assignments = Array.isArray(value.order_assignments)
        ? value.order_assignments
            .map(mapAssignment)
            .filter((item): item is AdminOrderAssignment => item !== null)
        : [];

    assignments.sort(
        (first, second) =>
            new Date(first.assignedAt || 0).getTime() -
            new Date(second.assignedAt || 0).getTime()
    );

    const requestedTons = numberValue(value.requested_tons);

    const assignedTons = assignments
        .filter(assignment => assignment.status !== "cancelled")
        .reduce((total, assignment) => total + assignment.assignedTons, 0);

    return {
        id,
        orderNumber: stringValue(value.order_number),
        companyName: stringValue(value.company_name_snapshot),
        siteName: stringValue(value.site_name_snapshot),
        siteAddress: stringValue(value.site_address_snapshot),
        requestedTons,
        assignedTons,
        remainingTons: Math.max(requestedTons - assignedTons, 0),
        status,
        note: nullableString(value.note),
        createdAt: stringValue(value.created_at),
        assignments
    };
}

export async function loadAdminActiveOrders(): Promise<AdminOrderListItem[]> {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            order_number,
            company_name_snapshot,
            site_name_snapshot,
            site_address_snapshot,
            requested_tons,
            status,
            note,
            created_at,
            order_assignments (
                id,
                assigned_tons,
                loaded_tons,
                status,
                driver_name_snapshot,
                truck_number_snapshot,
                trailer_number_snapshot,
                trailer_permit_snapshot,
                assigned_at
            )
        `)
        .in("status", ["pending", "partial", "assigned"])
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error(
            error.message ||
            "Заявките не можаха да бъдат заредени."
        );
    }

    return (data || [])
        .map(mapOrder)
        .filter(
            (item): item is AdminOrderListItem =>
                item !== null &&
                item.remainingTons > 0
        );
}

async function loadReadyOrderCompositions(): Promise<ReadyOrderComposition[]> {
    const [snapshot, loadResult] = await Promise.all([
        loadFleetSnapshot(),

        supabase
            .from("order_assignments")
            .select("truck_id, assigned_tons, status")
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
        new Map<string, number>();

    for (const row of loadResult.data || []) {
        if (!isRecord(row)) continue;

        const truckId =
            stringValue(row.truck_id);

        if (!truckId) continue;

        loadByTruck.set(
            truckId,
            (loadByTruck.get(truckId) || 0) +
            numberValue(row.assigned_tons)
        );
    }

    const result:
        ReadyOrderComposition[] = [];

    for (const truck of snapshot.trucks) {

        if (
            snapshot.lockedTruckIds.includes(
                truck.id
            )
        ) {
            continue;
        }

        const assignment =
            snapshot.activeAssignments.find(
                item =>
                    item.truckId === truck.id
            );

        if (
            !assignment ||
            assignment.assignmentMode !== "permanent" ||
            !assignment.driverId ||
            !assignment.trailerId
        ) {
            continue;
        }

        const driver =
            snapshot.drivers.find(
                item =>
                    item.id === assignment.driverId
            );

        const trailer =
            snapshot.trailers.find(
                item =>
                    item.id === assignment.trailerId
            );

        if (!driver || !trailer) {
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

        if (freeTons <= 0) {
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
        (first, second) =>
            first.truckNumber.localeCompare(
                second.truckNumber,
                "bg"
            )
    );

    return result;
}

export async function loadAdminOrdersWorkspace():
Promise<AdminOrdersWorkspace> {

    const [
        orders,
        compositions
    ] = await Promise.all([
        loadAdminActiveOrders(),
        loadReadyOrderCompositions()
    ]);

    return {
        orders,
        compositions
    };
}

function tonsToKg(tons: number): number {
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
            "Въведете валиден тонаж."
        );
    }

    return kg;
}

export async function assignOrderLoad(
    orderId: string,
    truckId: string,
    tons: number
): Promise<string> {

    const assignedKg =
        tonsToKg(tons);

    const {
        data,
        error
    } = await supabase.rpc(
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
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Товарът беше зачислен, но липсва идентификаторът на зачисляването."
        );
    }

    return data;
}
