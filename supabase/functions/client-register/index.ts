import {
    withSupabase
} from "npm:@supabase/server@^1";
import type {
    EdgeDatabase
} from "../_shared/database-contract.ts";


const AUTH_EMAIL_DOMAIN =
    "auth.k3.invalid";


type JsonRecord =
    Record<string, unknown>;


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


function numberValue(
    value: unknown
): number | null {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string" &&
                value.trim()
                ? Number(value)
                : Number.NaN;

    return Number.isFinite(parsed)
        ? parsed
        : null;
}


export default {
    fetch: withSupabase<EdgeDatabase>(
        {
            auth: "none"
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


            let parsedBody:
                unknown;


            try {
                parsedBody =
                    await request.json();
            } catch {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            if (!isRecord(parsedBody)) {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            const companyName =
                textValue(
                    parsedBody.companyName
                );

            const contactPerson =
                textValue(
                    parsedBody.contactPerson
                );

            const phone =
                textValue(
                    parsedBody.phone
                );

            const loginId =
                textValue(
                    parsedBody.loginId
                ).toLowerCase();

            const password =
                typeof parsedBody.password ===
                    "string"
                    ? parsedBody.password
                    : "";

            const loadingAddress =
                textValue(
                    parsedBody.loadingAddress
                );

            const latitude =
                numberValue(
                    parsedBody.latitude
                );

            const longitude =
                numberValue(
                    parsedBody.longitude
                );


            if (!companyName) {
                return jsonError(
                    "Въведете име на фирмата.",
                    400
                );
            }

            if (!contactPerson) {
                return jsonError(
                    "Въведете лице за контакт.",
                    400
                );
            }

            if (!phone) {
                return jsonError(
                    "Въведете телефон.",
                    400
                );
            }

            if (
                !/^[a-z0-9][a-z0-9._-]{2,31}$/
                    .test(loginId)
            ) {
                return jsonError(
                    "ID-то трябва да е 3–32 символа и може да съдържа латински букви, цифри, точка, тире и долна черта.",
                    400
                );
            }

            if (password.length < 8) {
                return jsonError(
                    "Паролата трябва да бъде поне 8 символа.",
                    400
                );
            }

            if (!loadingAddress) {
                return jsonError(
                    "Въведете адрес за товарене.",
                    400
                );
            }

            if (
                latitude === null ||
                latitude < -90 ||
                latitude > 90 ||
                longitude === null ||
                longitude < -180 ||
                longitude > 180
            ) {
                return jsonError(
                    "Изберете валидна позиция на картата.",
                    400
                );
            }


            const [
                profileResult,
                requestResult
            ] =
                await Promise.all([
                    context
                        .supabaseAdmin
                        .from("profiles")
                        .select("id")
                        .eq(
                            "login_id",
                            loginId
                        )
                        .limit(1)
                        .maybeSingle(),

                    context
                        .supabaseAdmin
                        .from(
                            "client_registration_requests"
                        )
                        .select("id")
                        .eq(
                            "login_id",
                            loginId
                        )
                        .in(
                            "status",
                            [
                                "pending",
                                "approved"
                            ]
                        )
                        .limit(1)
                        .maybeSingle()
                ]);


            if (
                profileResult.error ||
                requestResult.error
            ) {
                console.error(
                    "Registration duplicate check failed:",
                    profileResult.error ||
                        requestResult.error
                );

                return jsonError(
                    "Регистрацията не можа да бъде проверена.",
                    500
                );
            }


            if (
                profileResult.data ||
                requestResult.data
            ) {
                return jsonError(
                    "Това потребителско ID вече съществува или очаква одобрение.",
                    409
                );
            }


            const authEmail =
                `${loginId}@${AUTH_EMAIL_DOMAIN}`;


            const {
                data: authResult,
                error: authError
            } =
                await context
                    .supabaseAdmin
                    .auth
                    .admin
                    .createUser({
                        email:
                            authEmail,

                        password,

                        email_confirm:
                            true
                    });


            if (
                authError ||
                !authResult.user
            ) {
                console.error(
                    "Client registration Auth create failed:",
                    authError
                );

                return jsonError(
                    "Потребителското ID не може да бъде регистрирано.",
                    400
                );
            }


            const authUserId =
                authResult.user.id;


            const {
                error: insertError
            } =
                await context
                    .supabaseAdmin
                    .from(
                        "client_registration_requests"
                    )
                    .insert({
                        auth_user_id:
                            authUserId,

                        login_id:
                            loginId,

                        company_name:
                            companyName,

                        contact_person:
                            contactPerson,

                        phone,

                        loading_address:
                            loadingAddress,

                        latitude,

                        longitude,

                        status:
                            "pending"
                    });


            if (insertError) {
                console.error(
                    "Client registration insert failed:",
                    insertError
                );


                const {
                    error: cleanupError
                } =
                    await context
                        .supabaseAdmin
                        .auth
                        .admin
                        .deleteUser(
                            authUserId
                        );


                if (cleanupError) {
                    console.error(
                        "Client registration Auth cleanup failed:",
                        cleanupError
                    );
                }


                return jsonError(
                    "Заявката за регистрация не можа да бъде записана.",
                    500
                );
            }


            return Response.json(
                {
                    success: true
                },
                {
                    status: 201
                }
            );
        }
    )
};
