import {
    supabase
} from "../../shared/api/supabase";


export type FleetAssignmentMode =
    | "permanent"
    | "temporary_for_trip";


export type FleetTruck = {
    id: string;
    registrationNumber: string;
    isActive: boolean;
};


export type FleetTrailer = {
    id: string;
    registrationNumber: string;
    permitNumber: string | null;
    isActive: boolean;
};


export type FleetDriver = {
    id: string;
    employeeCode: string | null;
    name: string;
    isActive: boolean;
};


export type FleetHomeTruck = {
    driverId: string;
    truckId: string;
};


export type FleetAssignment = {
    id: string;

    driverId: string | null;

    truckId: string;

    trailerId: string | null;

    assignmentMode:
        FleetAssignmentMode;

    temporaryTripId:
        string | null;

    startedAt: string;
};


export type FleetSnapshot = {
    trucks: FleetTruck[];

    trailers: FleetTrailer[];

    drivers: FleetDriver[];

    homeTrucks: FleetHomeTruck[];

    activeAssignments:
        FleetAssignment[];

    lockedTruckIds: string[];
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


function readArray(
    value: unknown
): unknown[] {
    return Array.isArray(value)
        ? value
        : [];
}


function readString(
    value: unknown
): string {
    return typeof value === "string"
        ? value
        : "";
}


function readNullableString(
    value: unknown
): string | null {
    return typeof value === "string"
        ? value
        : null;
}


function readBoolean(
    value: unknown
): boolean {
    return value === true;
}


function parseTruck(
    value: unknown
): FleetTruck | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        readString(value.id);

    const registrationNumber =
        readString(
            value.registrationNumber
        );

    if (
        !id ||
        !registrationNumber
    ) {
        return null;
    }

    return {
        id,

        registrationNumber,

        isActive:
            readBoolean(
                value.isActive
            )
    };
}


function parseTrailer(
    value: unknown
): FleetTrailer | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        readString(value.id);

    const registrationNumber =
        readString(
            value.registrationNumber
        );

    if (
        !id ||
        !registrationNumber
    ) {
        return null;
    }

    return {
        id,

        registrationNumber,

        permitNumber:
            readNullableString(
                value.permitNumber
            ),

        isActive:
            readBoolean(
                value.isActive
            )
    };
}


function parseDriver(
    value: unknown
): FleetDriver | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        readString(value.id);

    const name =
        readString(value.name);

    if (
        !id ||
        !name
    ) {
        return null;
    }

    return {
        id,

        employeeCode:
            readNullableString(
                value.employeeCode
            ),

        name,

        isActive:
            readBoolean(
                value.isActive
            )
    };
}


function parseHomeTruck(
    value: unknown
): FleetHomeTruck | null {
    if (!isRecord(value)) {
        return null;
    }

    const driverId =
        readString(
            value.driverId
        );

    const truckId =
        readString(
            value.truckId
        );

    if (
        !driverId ||
        !truckId
    ) {
        return null;
    }

    return {
        driverId,
        truckId
    };
}


function parseAssignment(
    value: unknown
): FleetAssignment | null {
    if (!isRecord(value)) {
        return null;
    }

    const id =
        readString(value.id);

    const truckId =
        readString(
            value.truckId
        );

    const assignmentMode =
        readString(
            value.assignmentMode
        );

    if (
        !id ||
        !truckId
    ) {
        return null;
    }

    if (
        assignmentMode !==
            "permanent" &&
        assignmentMode !==
            "temporary_for_trip"
    ) {
        return null;
    }

    return {
        id,

        driverId:
            readNullableString(
                value.driverId
            ),

        truckId,

        trailerId:
            readNullableString(
                value.trailerId
            ),

        assignmentMode,

        temporaryTripId:
            readNullableString(
                value.temporaryTripId
            ),

        startedAt:
            readString(
                value.startedAt
            )
    };
}


function parseSnapshot(
    data: unknown
): FleetSnapshot {
    if (!isRecord(data)) {
        throw new Error(
            "Невалидни данни за автопарка."
        );
    }

    const trucks =
        readArray(data.trucks)
            .map(parseTruck)
            .filter(
                (
                    item
                ): item is FleetTruck =>
                    item !== null
            );

    const trailers =
        readArray(data.trailers)
            .map(parseTrailer)
            .filter(
                (
                    item
                ): item is FleetTrailer =>
                    item !== null
            );

    const drivers =
        readArray(data.drivers)
            .map(parseDriver)
            .filter(
                (
                    item
                ): item is FleetDriver =>
                    item !== null
            );

    const homeTrucks =
        readArray(data.homeTrucks)
            .map(parseHomeTruck)
            .filter(
                (
                    item
                ): item is FleetHomeTruck =>
                    item !== null
            );

    const activeAssignments =
        readArray(
            data.activeAssignments
        )
            .map(parseAssignment)
            .filter(
                (
                    item
                ): item is FleetAssignment =>
                    item !== null
            );

    const lockedTruckIds =
        readArray(
            data.lockedTruckIds
        )
            .filter(
                (
                    item
                ): item is string =>
                    typeof item ===
                    "string"
            );

    return {
        trucks,
        trailers,
        drivers,
        homeTrucks,
        activeAssignments,
        lockedTruckIds
    };
}


function rpcError(
    message: string | undefined,
    fallback: string
): Error {
    const normalizedMessage =
        message?.trim();

    return new Error(
        normalizedMessage ||
        fallback
    );
}


export async function loadFleetSnapshot():
    Promise<FleetSnapshot> {
    const {
        data,
        error
    } = await supabase.rpc(
        "fleet_get_snapshot"
    );

    if (error) {
        throw rpcError(
            error.message,
            "Автопаркът не можа да бъде зареден."
        );
    }

    return parseSnapshot(data);
}


export async function createFleetTruck(
    registrationNumber: string
): Promise<string> {
    const {
        data,
        error
    } = await supabase.rpc(
        "fleet_create_truck",
        {
            p_registration_number:
                registrationNumber
        }
    );

    if (error) {
        throw rpcError(
            error.message,
            "Камионът не можа да бъде добавен."
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Камионът беше добавен, но липсва неговият идентификатор."
        );
    }

    return data;
}


export async function createFleetTrailer(
    registrationNumber: string,
    permitNumber: string
): Promise<string> {
    const {
        data,
        error
    } = await supabase.rpc(
        "fleet_create_trailer",
        {
            p_registration_number:
                registrationNumber,

            p_bioexis_permit_number:
                permitNumber
        }
    );

    if (error) {
        throw rpcError(
            error.message,
            "Ремаркето не можа да бъде добавено."
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Ремаркето беше добавено, но липсва неговият идентификатор."
        );
    }

    return data;
}


export async function savePermanentComposition(
    truckId: string,
    driverId: string | null,
    trailerId: string | null
): Promise<string> {
    const {
        data,
        error
    } = await supabase.rpc(
        "fleet_set_permanent_composition",
        {
            p_truck_id:
                truckId,

            p_driver_id:
                driverId,

            p_trailer_id:
                trailerId
        }
    );

    if (error) {
        throw rpcError(
            error.message,
            "Композицията не можа да бъде запазена."
        );
    }

    if (
        typeof data !== "string" ||
        !data
    ) {
        throw new Error(
            "Композицията беше записана, но липсва нейният идентификатор."
        );
    }

    return data;
}


export async function releaseFleetTruck(
    truckId: string
): Promise<void> {
    const {
        data,
        error
    } = await supabase.rpc(
        "fleet_release_truck",
        {
            p_truck_id:
                truckId
        }
    );

    if (error) {
        throw rpcError(
            error.message,
            "Камионът не можа да бъде освободен."
        );
    }

    if (data !== true) {
        throw new Error(
            "Камионът не можа да бъде освободен."
        );
    }
}
