import { supabase } from "../../shared/api/supabase";

export type UserRole =
    | "admin"
    | "dispatcher"
    | "driver"
    | "client";

const VALID_ROLES: UserRole[] = [
    "admin",
    "dispatcher",
    "driver",
    "client"
];

function isUserRole(
    value: unknown
): value is UserRole {
    return (
        typeof value === "string" &&
        VALID_ROLES.includes(value as UserRole)
    );
}

export async function getCurrentUserRole():
    Promise<UserRole | null> {
    const {
        data,
        error
    } = await supabase.rpc(
        "get_my_primary_role"
    );

    if (error) {
        throw new Error(
            "K3 Logistics: unable to load user role."
        );
    }

    if (!isUserRole(data)) {
        return null;
    }

    return data;
}
