import {
    FunctionsHttpError
} from "@supabase/supabase-js";

import {
    supabase
} from "../../shared/api/supabase";


export type ClientRegistrationInput = {
    companyName: string;
    contactPerson: string;
    phone: string;
    loginId: string;
    password: string;
    loadingAddress: string;
    latitude: number;
    longitude: number;
};


export type PendingClientRegistration = {
    id: string;
    loginId: string;
    companyName: string;
    contactPerson: string;
    phone: string;
    loadingAddress: string;
    latitude: number;
    longitude: number;
    createdAt: string;
};


export type ReviewClientRegistrationInput = {
    requestId: string;
    decision: "approve" | "reject";
    note: string;
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


function numberValue(
    value: unknown
): number | null {
    if (
        typeof value !== "number" &&
        typeof value !== "string"
    ) {
        return null;
    }

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
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


    if (
        error instanceof Error &&
        error.message.trim()
    ) {
        return error.message.trim();
    }


    return fallback;
}


export async function submitClientRegistration(
    input: ClientRegistrationInput
): Promise<void> {
    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "client-register",
                {
                    body: input
                }
            );


    if (error) {
        throw new Error(
            await functionErrorMessage(
                error,
                "Заявката за регистрация не можа да бъде изпратена."
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
                : "Заявката за регистрация не можа да бъде изпратена."
        );
    }
}


export async function loadPendingClientRegistrations():
Promise<PendingClientRegistration[]> {
    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "admin-client-registration",
                {
                    body: {
                        action: "list"
                    }
                }
            );


    if (error) {
        throw new Error(
            await functionErrorMessage(
                error,
                "Регистрациите не можаха да бъдат заредени."
            )
        );
    }


    if (
        !isRecord(data) ||
        data.success !== true ||
        !Array.isArray(data.requests)
    ) {
        throw new Error(
            "Регистрациите не можаха да бъдат заредени."
        );
    }


    const requests:
        PendingClientRegistration[] =
        [];


    for (const value of data.requests) {
        if (!isRecord(value)) {
            continue;
        }


        const id =
            stringValue(value.id);

        const latitude =
            numberValue(
                value.latitude
            );

        const longitude =
            numberValue(
                value.longitude
            );


        if (
            !id ||
            latitude === null ||
            longitude === null
        ) {
            continue;
        }


        requests.push({
            id,

            loginId:
                stringValue(
                    value.loginId
                ),

            companyName:
                stringValue(
                    value.companyName
                ),

            contactPerson:
                stringValue(
                    value.contactPerson
                ),

            phone:
                stringValue(
                    value.phone
                ),

            loadingAddress:
                stringValue(
                    value.loadingAddress
                ),

            latitude,
            longitude,

            createdAt:
                stringValue(
                    value.createdAt
                )
        });
    }


    return requests;
}


export async function reviewClientRegistration(
    input: ReviewClientRegistrationInput
): Promise<string> {
    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "admin-client-registration",
                {
                    body: {
                        action:
                            "review",

                        requestId:
                            input.requestId,

                        decision:
                            input.decision,

                        note:
                            input.note ||
                            null
                    }
                }
            );


    if (error) {
        throw new Error(
            await functionErrorMessage(
                error,
                "Регистрацията не можа да бъде прегледана."
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
                : "Регистрацията не можа да бъде прегледана."
        );
    }


    return typeof data.message ===
        "string"
        ? data.message
        : input.decision === "approve"
            ? "Регистрацията е одобрена."
            : "Регистрацията е отказана.";
}
