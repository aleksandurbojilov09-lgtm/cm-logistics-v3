import {
    FunctionsHttpError
} from "@supabase/supabase-js";

import {
    supabase
} from "../../shared/api/supabase";

import {
    normalizeLoginId
} from "../../shared/lib/auth-login-id";


const GENERIC_RESPONSE =
    "Ако това ID съществува и има право на възстановяване, заявката е изпратена към администратор или диспечер.";


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


async function functionErrorMessage(
    error: unknown
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
            // Use the safe fallback.
        }
    }


    return "Заявката не можа да бъде изпратена. Опитайте отново.";
}


export async function requestPasswordReset(
    loginId: string
): Promise<string> {
    const {
        data,
        error
    } =
        await supabase
            .functions
            .invoke(
                "password-reset-request",
                {
                    body: {
                        loginId:
                            normalizeLoginId(
                                loginId
                            )
                    }
                }
            );


    if (error) {
        throw new Error(
            await functionErrorMessage(
                error
            )
        );
    }


    if (
        !isRecord(data) ||
        data.success !== true
    ) {
        throw new Error(
            "Заявката не можа да бъде изпратена. Опитайте отново."
        );
    }


    return typeof data.message ===
        "string" &&
        data.message.trim()
        ? data.message.trim()
        : GENERIC_RESPONSE;
}
