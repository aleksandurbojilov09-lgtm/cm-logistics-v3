import {
    withSupabase
} from "npm:@supabase/server@^1";


const AUTH_EMAIL_DOMAIN =
    "auth.k3.invalid";


const VALID_ROLES = new Set([
    "admin",
    "dispatcher",
    "driver",
    "client"
]);


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


function textValue(
    value: unknown
): string {
    return typeof value === "string"
        ? value.trim()
        : "";
}


function loginValue(
    value: unknown
): string {
    return textValue(value)
        .toLowerCase();
}


function nullableTextValue(
    value: unknown
): string | null {
    const valueText =
        textValue(value);

    return valueText || null;
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


            // =================================================
            // VERIFY ACTIVE CALLER
            // =================================================


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
                callerAdminError
            ) {
                console.error(
                    "Caller admin lookup failed:",
                    callerAdminError
                );

                return jsonError(
                    "Правата не можаха да бъдат проверени.",
                    500
                );
            }


            const callerIsAdmin =
                callerAdmin !== null;


            // =================================================
            // REQUEST BODY
            // =================================================


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


            if (
                !isRecord(
                    parsedBody
                )
            ) {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            const action =
                textValue(
                    parsedBody.action
                );


            if (
                action !== "create"
            ) {
                return jsonError(
                    "Неподдържана операция.",
                    400
                );
            }


            const loginId =
                loginValue(
                    parsedBody.loginId
                );


            const displayName =
                textValue(
                    parsedBody.displayName
                );


            const phone =
                nullableTextValue(
                    parsedBody.phone
                );


            const password =
                typeof parsedBody.password ===
                    "string"
                    ? parsedBody.password
                    : "";


            const roleCode =
                textValue(
                    parsedBody.roleCode
                ).toLowerCase();


            const employeeCode =
                nullableTextValue(
                    parsedBody.employeeCode
                );


            const companyId =
                nullableTextValue(
                    parsedBody.companyId
                );


            // =================================================
            // AUTHORIZATION
            // =================================================


            if (!callerIsAdmin) {

                /*
                 * Dispatcher may use this privileged
                 * endpoint ONLY for Driver creation.
                 */

                if (
                    roleCode !==
                    "driver"
                ) {
                    return jsonError(
                        "Нямате право да създавате този тип потребител.",
                        403
                    );
                }


                const {
                    data:
                        canManageDrivers,

                    error:
                        permissionError
                } =
                    await context
                        .supabase
                        .rpc(
                            "has_my_permission",
                            {
                                p_permission_code:
                                    "drivers.manage"
                            }
                        );


                if (permissionError) {
                    console.error(
                        "drivers.manage check failed:",
                        permissionError
                    );

                    return jsonError(
                        "Правата за шофьори не можаха да бъдат проверени.",
                        500
                    );
                }


                if (
                    canManageDrivers !==
                    true
                ) {
                    return jsonError(
                        "Нямате право да управлявате шофьори.",
                        403
                    );
                }
            }


            // =================================================
            // VALIDATION
            // =================================================


            if (
                !/^[a-z0-9][a-z0-9._-]{2,31}$/
                    .test(loginId)
            ) {
                return jsonError(
                    "ID-то трябва да е 3–32 символа и може да съдържа латински букви, цифри, точка, тире и долна черта.",
                    400
                );
            }


            if (
                displayName.length < 2
            ) {
                return jsonError(
                    "Въведете име.",
                    400
                );
            }


            if (
                password.length < 8
            ) {
                return jsonError(
                    "Паролата трябва да бъде поне 8 символа.",
                    400
                );
            }


            if (
                !VALID_ROLES.has(
                    roleCode
                )
            ) {
                return jsonError(
                    "Невалидна роля.",
                    400
                );
            }


            if (
                roleCode === "driver" &&
                !phone
            ) {
                return jsonError(
                    "Въведете телефон на шофьора.",
                    400
                );
            }


            if (
                roleCode === "client"
            ) {

                if (
                    !companyId ||
                    !isUuid(companyId)
                ) {
                    return jsonError(
                        "Изберете валидна клиентска фирма.",
                        400
                    );
                }

            } else if (companyId) {

                return jsonError(
                    "Фирма може да бъде зададена само на клиент.",
                    400
                );
            }


            // =================================================
            // DUPLICATE LOGIN
            // =================================================


            const {
                data: existingProfile,
                error: existingError
            } =
                await context
                    .supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq(
                        "login_id",
                        loginId
                    )
                    .maybeSingle();


            if (existingError) {
                console.error(
                    "Login lookup failed:",
                    existingError
                );

                return jsonError(
                    "Потребителят не можа да бъде проверен.",
                    500
                );
            }


            if (existingProfile) {
                return jsonError(
                    "Това потребителско ID вече съществува.",
                    409
                );
            }


            // =================================================
            // VALIDATE CLIENT COMPANY
            // =================================================


            if (
                roleCode === "client" &&
                companyId
            ) {

                const {
                    data: company,
                    error: companyError
                } =
                    await context
                        .supabaseAdmin
                        .from(
                            "client_companies"
                        )
                        .select(
                            "id, is_active"
                        )
                        .eq(
                            "id",
                            companyId
                        )
                        .maybeSingle();


                if (
                    companyError ||
                    !company ||
                    !company.is_active
                ) {
                    return jsonError(
                        "Клиентската фирма не е намерена или е неактивна.",
                        400
                    );
                }
            }


            // =================================================
            // CREATE AUTH USER
            // =================================================


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
                    "Auth create failed:",
                    authError
                );

                return jsonError(
                    "Потребителят не можа да бъде създаден.",
                    400
                );
            }


            const newUserId =
                authResult.user.id;


            // =================================================
            // ATOMIC APP RECORDS
            // =================================================


            const {
                error: provisionError
            } =
                await context
                    .supabaseAdmin
                    .rpc(
                        "admin_provision_app_user",
                        {
                            p_user_id:
                                newUserId,

                            p_login_id:
                                loginId,

                            p_display_name:
                                displayName,

                            p_phone:
                                phone,

                            p_role_code:
                                roleCode,

                            p_employee_code:
                                employeeCode,

                            p_company_id:
                                companyId
                        }
                    );


            if (provisionError) {

                console.error(
                    "Provision failed:",
                    provisionError
                );


                // Do not leave orphan Auth users.

                const {
                    error: cleanupError
                } =
                    await context
                        .supabaseAdmin
                        .auth
                        .admin
                        .deleteUser(
                            newUserId
                        );


                if (cleanupError) {
                    console.error(
                        "Auth cleanup failed:",
                        cleanupError
                    );
                }


                return jsonError(
                    "Потребителят не можа да бъде записан в системата.",
                    500
                );
            }


            // =================================================
            // SUCCESS
            // =================================================


            return Response.json(
                {
                    success: true,

                    user: {
                        id:
                            newUserId,

                        loginId,

                        displayName,

                        phone,

                        roleCode,

                        employeeCode,

                        companyId
                    }
                },
                {
                    status: 201
                }
            );
        }
    )
};
