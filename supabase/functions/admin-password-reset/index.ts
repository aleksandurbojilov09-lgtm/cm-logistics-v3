import {
    withSupabase
} from "npm:@supabase/server@^1";
import type {
    EdgeDatabase
} from "../_shared/database-contract.ts";


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
    return typeof value === "string"
        ? value.trim()
        : "";
}


function nullableText(
    value: unknown
): string | null {
    const text =
        textValue(value);

    return text || null;
}


function isUuid(
    value: string
): boolean {
    return (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(value)
    );
}


function jsonError(
    message: string,
    status: number
): Response {
    return Response.json(
        {
            success: false,
            message
        },
        {
            status
        }
    );
}


function databaseErrorCode(
    error: unknown
): string {
    return (
        isRecord(error) &&
        typeof error.code ===
            "string"
    )
        ? error.code
        : "";
}


function databaseActionError(
    error: unknown,
    fallback: string
): Response {
    const code =
        databaseErrorCode(error);


    if (code === "42501") {
        return jsonError(
            "Нямате право за тази операция.",
            403
        );
    }


    if (code === "P0002") {
        return jsonError(
            "Заявката не е намерена.",
            404
        );
    }


    if (
        code === "55000" ||
        code === "55P03"
    ) {
        return jsonError(
            "Заявката вече е обработена или се обработва от друг оператор.",
            409
        );
    }


    return jsonError(
        fallback,
        500
    );
}


export default {
    fetch: withSupabase<EdgeDatabase>(
        {
            auth: "user"
        },

        async (
            request,
            context
        ) => {

            if (
                request.method !== "POST"
            ) {
                return jsonError(
                    "Методът не е позволен.",
                    405
                );
            }


            const callerId =
                context.userClaims?.id;


            if (!callerId) {
                return jsonError(
                    "Невалидна сесия.",
                    401
                );
            }


            const {
                data: callerProfile,
                error: callerProfileError
            } =
                await context
                    .supabaseAdmin
                    .from("profiles")
                    .select("is_active")
                    .eq(
                        "id",
                        callerId
                    )
                    .maybeSingle();


            if (
                callerProfileError ||
                callerProfile?.is_active !==
                    true
            ) {
                return jsonError(
                    "Нямате право за тази операция.",
                    403
                );
            }


            let body:
                unknown;


            try {
                body =
                    await request.json();
            } catch {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            if (!isRecord(body)) {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            const action =
                textValue(
                    body.action
                ).toLowerCase();


            if (
                action !== "list" &&
                action !== "reject" &&
                action !== "reset"
            ) {
                return jsonError(
                    "Неподдържана операция.",
                    400
                );
            }


            if (action === "list") {
                const {
                    data,
                    error
                } =
                    await context
                        .supabaseAdmin
                        .rpc(
                            "admin_list_password_reset_requests",
                            {
                                p_actor_user_id:
                                    callerId
                            }
                        );


                if (error) {
                    console.error(
                        "Password reset list failed:",
                        error
                    );

                    return databaseActionError(
                        error,
                        "Заявките не можаха да бъдат заредени."
                    );
                }


                const requests =
                    (
                        Array.isArray(data)
                            ? data
                            : []
                    )
                        .filter(
                            isRecord
                        )
                        .map(
                            row => ({
                                id:
                                    textValue(
                                        row.request_id
                                    ),

                                userId:
                                    textValue(
                                        row.user_id
                                    ),

                                status:
                                    textValue(
                                        row.request_status
                                    ),

                                role:
                                    textValue(
                                        row.target_role
                                    ),

                                loginId:
                                    textValue(
                                        row.login_id
                                    ),

                                requestedAt:
                                    textValue(
                                        row.requested_at
                                    ),

                                displayName:
                                    nullableText(
                                        row.display_name
                                    ),

                                profilePhone:
                                    nullableText(
                                        row.profile_phone
                                    ),

                                companyName:
                                    nullableText(
                                        row.company_name
                                    ),

                                contactPerson:
                                    nullableText(
                                        row.contact_person
                                    ),

                                companyPhone:
                                    nullableText(
                                        row.company_phone
                                    )
                            })
                        );


                return Response.json({
                    success: true,
                    requests
                });
            }


            const requestId =
                textValue(
                    body.requestId
                );


            if (!isUuid(requestId)) {
                return jsonError(
                    "Невалидна заявка.",
                    400
                );
            }


            if (action === "reject") {
                const {
                    error
                } =
                    await context
                        .supabaseAdmin
                        .rpc(
                            "admin_reject_password_reset_request",
                            {
                                p_request_id:
                                    requestId,

                                p_actor_user_id:
                                    callerId
                            }
                        );


                if (error) {
                    console.error(
                        "Password reset reject failed:",
                        error
                    );

                    return databaseActionError(
                        error,
                        "Заявката не можа да бъде отказана."
                    );
                }


                return Response.json({
                    success: true,
                    message:
                        "Заявката е отказана."
                });
            }


            const newPassword =
                typeof body.newPassword ===
                    "string"
                    ? body.newPassword
                    : "";


            if (
                newPassword.length < 8 ||
                newPassword.length > 128
            ) {
                return jsonError(
                    "Паролата трябва да бъде между 8 и 128 символа.",
                    400
                );
            }


            const {
                data: claimData,
                error: claimError
            } =
                await context
                    .supabaseAdmin
                    .rpc(
                        "admin_claim_password_reset_request",
                        {
                            p_request_id:
                                requestId,

                            p_actor_user_id:
                                callerId
                        }
                    );


            if (claimError) {
                console.error(
                    "Password reset claim failed:",
                    claimError
                );

                return databaseActionError(
                    claimError,
                    "Заявката не можа да бъде поета."
                );
            }


            if (
                !isRecord(claimData)
            ) {
                return jsonError(
                    "Заявката върна невалидни данни.",
                    500
                );
            }


            const targetUserId =
                textValue(
                    claimData.userId
                );

            const targetRole =
                textValue(
                    claimData.roleCode
                );


            if (
                !isUuid(targetUserId) ||
                (
                    targetRole !== "client" &&
                    targetRole !== "driver"
                )
            ) {
                return jsonError(
                    "Акаунтът няма право на това възстановяване.",
                    409
                );
            }


            const {
                error: authError
            } =
                await context
                    .supabaseAdmin
                    .auth
                    .admin
                    .updateUserById(
                        targetUserId,
                        {
                            password:
                                newPassword
                        }
                    );


            if (authError) {
                console.error(
                    "Password reset Auth update failed:",
                    authError
                );

                return jsonError(
                    "Паролата не можа да бъде сменена. Заявката остава поета за безопасен повторен опит.",
                    500
                );
            }


            const {
                error: completeError
            } =
                await context
                    .supabaseAdmin
                    .rpc(
                        "admin_complete_password_reset_request",
                        {
                            p_request_id:
                                requestId,

                            p_actor_user_id:
                                callerId
                        }
                    );


            if (completeError) {
                console.error(
                    "Password reset completion failed:",
                    completeError
                );

                return jsonError(
                    "Паролата е сменена, но заявката не можа да бъде финализирана. Повторете със същата парола.",
                    500
                );
            }


            return Response.json({
                success: true,
                message:
                    "Паролата е сменена успешно."
            });
        }
    )
};
