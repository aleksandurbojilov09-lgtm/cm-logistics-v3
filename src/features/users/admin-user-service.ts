import {
    FunctionsHttpError
} from "@supabase/supabase-js";

import {
    supabase
} from "../../shared/api/supabase";

import {
    loadFleetSnapshot
} from "../fleet/fleet-service";


export type AdminDriverListItem = {
    id: string;

    displayName: string;

    phone: string;

    loginId: string;

    employeeCode: string | null;

    isActive: boolean;

    homeTruckRegistration:
        string | null;

    currentTruckRegistration:
        string | null;

    currentTrailerRegistration:
        string | null;

    currentTrailerPermit:
        string | null;

    assignmentMode:
        | "permanent"
        | "temporary_for_trip"
        | null;
};


type CreateManagedAccountInput = {
    displayName: string;

    phone: string;

    loginId: string;

    password: string;
};


export type CreateDriverInput =
    CreateManagedAccountInput;


export type CreateDispatcherInput =
    CreateManagedAccountInput;


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


async function getFunctionErrorMessage(
    error: unknown,
    fallback: string
): Promise<string> {

    if (
        error instanceof
        FunctionsHttpError
    ) {
        try {
            const body:
                unknown =
                await error.context.json();

            if (
                isRecord(body) &&
                typeof body.message ===
                    "string" &&
                body.message.trim()
            ) {
                return body.message.trim();
            }

        } catch {
            // Use fallback below.
        }
    }


    if (
        error instanceof Error &&
        error.message.trim()
    ) {
        return error.message.trim();
    }


    return fallback;
}


export async function loadAdminDrivers():
    Promise<AdminDriverListItem[]> {

    const snapshot =
        await loadFleetSnapshot();


    const driverIds =
        snapshot.drivers.map(
            driver => driver.id
        );


    if (
        driverIds.length === 0
    ) {
        return [];
    }


    const {
        data,
        error
    } =
        await supabase
            .from("profiles")
            .select(
                `
                id,
                display_name,
                phone,
                login_id,
                is_active
                `
            )
            .in(
                "id",
                driverIds
            );


    if (error) {
        throw new Error(
            "Шофьорите не можаха да бъдат заредени."
        );
    }


    const profiles =
        Array.isArray(data)
            ? data
            : [];


    const profilesById =
        new Map<
            string,
            JsonRecord
        >();


    for (
        const profile
        of profiles
    ) {
        if (
            !isRecord(profile)
        ) {
            continue;
        }

        const id =
            readString(
                profile.id
            );

        if (!id) {
            continue;
        }

        profilesById.set(
            id,
            profile
        );
    }


    const result:
        AdminDriverListItem[] =
        [];


    for (
        const driver
        of snapshot.drivers
    ) {

        const profile =
            profilesById.get(
                driver.id
            );


        if (!profile) {
            continue;
        }


        const isActive =
            profile.is_active ===
                true;


        if (!isActive) {
            continue;
        }


        const homeRelation =
            snapshot.homeTrucks.find(
                item =>
                    item.driverId ===
                    driver.id
            );


        const homeTruck =
            homeRelation
                ? snapshot.trucks.find(
                    truck =>
                        truck.id ===
                        homeRelation.truckId
                )
                : null;


        const assignment =
            snapshot
                .activeAssignments
                .find(
                    item =>
                        item.driverId ===
                        driver.id
                );


        const currentTruck =
            assignment
                ? snapshot.trucks.find(
                    truck =>
                        truck.id ===
                        assignment.truckId
                )
                : null;


        const currentTrailer =
            assignment?.trailerId
                ? snapshot.trailers.find(
                    trailer =>
                        trailer.id ===
                        assignment.trailerId
                )
                : null;


        result.push(
            {
                id:
                    driver.id,

                displayName:
                    readString(
                        profile.display_name
                    ) ||
                    driver.name,

                phone:
                    readString(
                        profile.phone
                    ),

                loginId:
                    readString(
                        profile.login_id
                    ),

                employeeCode:
                    driver.employeeCode,

                isActive:
                    true,

                homeTruckRegistration:
                    homeTruck
                        ?.registrationNumber ||
                    null,

                currentTruckRegistration:
                    currentTruck
                        ?.registrationNumber ||
                    null,

                currentTrailerRegistration:
                    currentTrailer
                        ?.registrationNumber ||
                    null,

                currentTrailerPermit:
                    readNullableString(
                        currentTrailer
                            ?.permitNumber
                    ),

                assignmentMode:
                    assignment
                        ?.assignmentMode ||
                    null
            }
        );
    }


    result.sort(
        (
            first,
            second
        ) =>
            first.displayName
                .localeCompare(
                    second.displayName,
                    "bg"
                )
    );


    return result;
}


async function createManagedAccount(
    input: CreateManagedAccountInput,
    roleCode: "driver" | "dispatcher",
    fallbackMessage: string
): Promise<void> {

    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "admin-user-manage",
                {
                    body: {
                        action:
                            "create",

                        loginId:
                            input.loginId,

                        displayName:
                            input.displayName,

                        phone:
                            input.phone,

                        password:
                            input.password,

                        roleCode,

                        employeeCode:
                            null
                    }
                }
            );


    if (error) {
        throw new Error(
            await getFunctionErrorMessage(
                error,
                fallbackMessage
            )
        );
    }


    if (
        !isRecord(data) ||
        data.success !== true
    ) {
        throw new Error(
            (
                isRecord(data) &&
                typeof data.message ===
                    "string" &&
                data.message
            )
                ? data.message
                : fallbackMessage
        );
    }
}


export async function createDriverAccount(
    input: CreateDriverInput
): Promise<void> {

    await createManagedAccount(
        input,
        "driver",
        "Шофьорът не можа да бъде създаден."
    );
}


export async function createDispatcherAccount(
    input: CreateDispatcherInput
): Promise<void> {

    await createManagedAccount(
        input,
        "dispatcher",
        "Диспечерът не можа да бъде създаден."
    );
}
