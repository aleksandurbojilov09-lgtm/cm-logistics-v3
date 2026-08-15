import {
    withSupabase
} from "npm:@supabase/server@^1";


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


function nullableTextValue(
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


export default {
    fetch: withSupabase(
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
                error: profileError
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
                profileError ||
                !callerProfile?.is_active
            ) {
                return jsonError(
                    "Нямате право за тази операция.",
                    403
                );
            }


            const {
                data: adminRole,
                error: adminRoleError
            } =
                await context
                    .supabaseAdmin
                    .from("roles")
                    .select("id")
                    .eq(
                        "code",
                        "admin"
                    )
                    .single();


            if (
                adminRoleError ||
                !adminRole
            ) {
                console.error(
                    "Admin role lookup failed:",
                    adminRoleError
                );

                return jsonError(
                    "Системната Admin роля липсва.",
                    500
                );
            }


            const {
                data: callerAdmin,
                error: callerAdminError
            } =
                await context
                    .supabaseAdmin
                    .from("user_roles")
                    .select("user_id")
                    .eq(
                        "user_id",
                        callerId
                    )
                    .eq(
                        "role_id",
                        adminRole.id
                    )
                    .maybeSingle();


            if (
                callerAdminError ||
                !callerAdmin
            ) {
                return jsonError(
                    "Само администратор може да преглежда клиентски регистрации.",
                    403
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


            const action =
                textValue(
                    parsedBody.action
                ).toLowerCase();


            if (action === "list") {
                const {
                    data,
                    error
                } =
                    await context
                        .supabaseAdmin
                        .from(
                            "client_registration_requests"
                        )
                        .select(
                            `
                            id,
                            auth_user_id,
                            login_id,
                            company_name,
                            contact_person,
                            phone,
                            loading_address,
                            latitude,
                            longitude,
                            created_at
                            `
                        )
                        .eq(
                            "status",
                            "pending"
                        )
                        .order(
                            "created_at",
                            {
                                ascending: true
                            }
                        );


                if (error) {
                    console.error(
                        "Client registrations list failed:",
                        error
                    );

                    return jsonError(
                        "Регистрациите не можаха да бъдат заредени.",
                        500
                    );
                }


                return Response.json({
                    success: true,

                    requests:
                        (data || [])
                            .map(
                                row => ({
                                    id:
                                        row.id,

                                    loginId:
                                        row.login_id,

                                    companyName:
                                        row.company_name,

                                    contactPerson:
                                        row.contact_person,

                                    phone:
                                        row.phone,

                                    loadingAddress:
                                        row.loading_address,

                                    latitude:
                                        row.latitude,

                                    longitude:
                                        row.longitude,

                                    createdAt:
                                        row.created_at
                                })
                            )
                });
            }


            if (action !== "review") {
                return jsonError(
                    "Неподдържана операция.",
                    400
                );
            }


            const requestId =
                textValue(
                    parsedBody.requestId
                );

            const decision =
                textValue(
                    parsedBody.decision
                ).toLowerCase();

            const note =
                nullableTextValue(
                    parsedBody.note
                );


            if (!isUuid(requestId)) {
                return jsonError(
                    "Невалидна регистрация.",
                    400
                );
            }

            if (
                decision !== "approve" &&
                decision !== "reject"
            ) {
                return jsonError(
                    "Невалидно решение.",
                    400
                );
            }


            const {
                data: registration,
                error: registrationError
            } =
                await context
                    .supabaseAdmin
                    .from(
                        "client_registration_requests"
                    )
                    .select(
                        "auth_user_id, status"
                    )
                    .eq(
                        "id",
                        requestId
                    )
                    .maybeSingle();


            if (
                registrationError ||
                !registration
            ) {
                return jsonError(
                    "Регистрацията не е намерена.",
                    404
                );
            }

            if (
                registration.status !==
                    "pending"
            ) {
                return jsonError(
                    "Регистрацията вече е прегледана.",
                    409
                );
            }


            const {
                error: reviewError
            } =
                await context
                    .supabaseAdmin
                    .rpc(
                        "admin_review_client_registration",
                        {
                            p_request_id:
                                requestId,

                            p_admin_user_id:
                                callerId,

                            p_decision:
                                decision,

                            p_note:
                                note
                        }
                    );


            if (reviewError) {
                console.error(
                    "Client registration review failed:",
                    reviewError
                );

                return jsonError(
                    "Регистрацията не можа да бъде прегледана.",
                    500
                );
            }


            if (
                decision === "reject" &&
                typeof registration.auth_user_id ===
                    "string" &&
                registration.auth_user_id
            ) {
                const {
                    error: cleanupError
                } =
                    await context
                        .supabaseAdmin
                        .auth
                        .admin
                        .deleteUser(
                            registration.auth_user_id
                        );


                if (cleanupError) {
                    console.error(
                        "Rejected client Auth cleanup failed:",
                        cleanupError
                    );
                }
            }


            return Response.json({
                success: true,

                message:
                    decision === "approve"
                        ? "Регистрацията е одобрена."
                        : "Регистрацията е отказана."
            });
        }
    )
};
