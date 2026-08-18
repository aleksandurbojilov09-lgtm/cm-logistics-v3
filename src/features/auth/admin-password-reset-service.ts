import {
    FunctionsHttpError
} from "@supabase/supabase-js";

import {
    supabase
} from "../../shared/api/supabase";


export type PasswordResetTargetRole =
    | "client"
    | "driver";


export type PendingPasswordResetRequest = {
    id: string;
    userId: string;
    status: "pending" | "processing";
    role: PasswordResetTargetRole;
    loginId: string;
    requestedAt: string;
    displayName: string | null;
    profilePhone: string | null;
    companyName: string | null;
    contactPerson: string | null;
    companyPhone: string | null;
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
    return typeof value === "string"
        ? value
        : "";
}


function nullableString(
    value: unknown
): string | null {
    const text =
        stringValue(value).trim();

    return text
        ? text
        : null;
}


async function functionErrorMessage(
    error: unknown,
    fallback: string
): Promise<string> {
    if (
        error instanceof
        FunctionsHttpError
    ) {
        try {
            const body: unknown =
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
            // Use fallback.
        }
    }


    return fallback;
}


async function invokePasswordResetAdmin(
    body: JsonRecord,
    fallback: string
): Promise<JsonRecord> {
    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "admin-password-reset",
                {
                    body
                }
            );


    if (error) {
        throw new Error(
            await functionErrorMessage(
                error,
                fallback
            )
        );
    }


    if (
        !isRecord(data) ||
        data.success !== true
    ) {
        throw new Error(
            isRecord(data) &&
            typeof data.message ===
                "string"
                ? data.message
                : fallback
        );
    }


    return data;
}


export async function loadPasswordResetRequests():
Promise<PendingPasswordResetRequest[]> {
    const data =
        await invokePasswordResetAdmin(
            {
                action: "list"
            },
            "Заявките за парола не можаха да бъдат заредени."
        );


    if (!Array.isArray(data.requests)) {
        throw new Error(
            "Заявките за парола не можаха да бъдат заредени."
        );
    }


    const requests:
        PendingPasswordResetRequest[] =
        [];


    for (const value of data.requests) {
        if (!isRecord(value)) {
            continue;
        }


        const id =
            stringValue(value.id);

        const userId =
            stringValue(value.userId);

        const role =
            stringValue(value.role);

        const status =
            stringValue(value.status);


        if (
            !id ||
            !userId ||
            (
                role !== "client" &&
                role !== "driver"
            ) ||
            (
                status !== "pending" &&
                status !== "processing"
            )
        ) {
            continue;
        }


        requests.push({
            id,
            userId,
            role,
            status,

            loginId:
                stringValue(
                    value.loginId
                ),

            requestedAt:
                stringValue(
                    value.requestedAt
                ),

            displayName:
                nullableString(
                    value.displayName
                ),

            profilePhone:
                nullableString(
                    value.profilePhone
                ),

            companyName:
                nullableString(
                    value.companyName
                ),

            contactPerson:
                nullableString(
                    value.contactPerson
                ),

            companyPhone:
                nullableString(
                    value.companyPhone
                )
        });
    }


    return requests;
}


export async function rejectPasswordResetRequest(
    requestId: string
): Promise<string> {
    const data =
        await invokePasswordResetAdmin(
            {
                action: "reject",
                requestId
            },
            "Заявката не можа да бъде отказана."
        );


    return typeof data.message ===
        "string"
        ? data.message
        : "Заявката е отказана.";
}


export async function resetRequestedPassword(
    requestId: string,
    newPassword: string
): Promise<string> {
    const data =
        await invokePasswordResetAdmin(
            {
                action: "reset",
                requestId,
                newPassword
            },
            "Паролата не можа да бъде сменена."
        );


    return typeof data.message ===
        "string"
        ? data.message
        : "Паролата е сменена успешно.";
}
