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


type CreateUserBody = {
    action: "create";

    loginId: string;

    displayName: string;

    password: string;

    roleCode:
        | "admin"
        | "dispatcher"
        | "driver"
        | "client";

    employeeCode?: string | null;
};


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


function normalizeLoginId(
    value: unknown
): string {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value
        .trim()
        .toLowerCase();
}


function normalizeText(
    value: unknown
): string {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value.trim();
}


function isValidLoginId(
    value: string
): boolean {
    return (
        /^[a-z0-9][a-z0-9._-]{2,31}$/
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
                request.method !==
                "POST"
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


            /*
             * =================================================
             * VERIFY ACTIVE ADMIN
             * =================================================
             */


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
                !callerProfile?.is_active
            ) {
                return jsonError(
                    "Потребителят няма право за тази операция.",
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
                    "Системната роля Admin не е намерена.",
                    500
                );
            }


            const {
                data: callerAdminRole,
                error:
                    callerAdminRoleError
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
                callerAdminRoleError ||
                !callerAdminRole
            ) {
                return jsonError(
                    "Само администратор може да управлява потребители.",
                    403
                );
            }


            /*
             * =================================================
             * REQUEST
             * =================================================
             */


            let body:
                Partial<CreateUserBody>;


            try {
                body =
                    await request.json();
            } catch {
                return jsonError(
                    "Невалидни данни.",
                    400
                );
            }


            if (
                body.action !==
                "create"
            ) {
                return jsonError(
                    "Неподдържана операция.",
                    400
                );
            }


            const loginId =
                normalizeLoginId(
                    body.loginId
                );


            const displayName =
                normalizeText(
                    body.displayName
                );


            const password =
                typeof body.password ===
                    "string"
                    ? body.password
                    : "";


            const roleCode =
                normalizeText(
                    body.roleCode
                );


            const employeeCode =
                normalizeText(
                    body.employeeCode
                ) || null;


            if (
                !isValidLoginId(
                    loginId
                )
            ) {
                return jsonError(
                    "ID-то трябва да е 3–32 символа и да съдържа само малки латински букви, цифри, точка, тире или долна черта.",
                    400
                );
            }


            if (
                displayName.length < 2
            ) {
                return jsonError(
                    "Въведете име на потребителя.",
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


            /*
             * =================================================
             * DUPLICATE LOGIN ID
             * =================================================
             */


            const {
                data: existingProfile,
                error:
                    existingProfileError
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


            if (existingProfileError) {
                console.error(
                    "Login ID lookup failed:",
                    existingProfileError
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


            /*
             * =================================================
             * CREATE AUTH USER
             * =================================================
             */


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
                    "Auth user creation failed:",
                    authError
                );

                return jsonError(
                    "Това потребителско ID вече се използва или потребителят не можа да бъде създаден.",
                    400
                );
            }


            const newUserId =
                authResult.user.id;


            /*
             * =================================================
             * ATOMIC APP RECORDS
             * =================================================
             */


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

                            p_role_code:
                                roleCode,

                            p_employee_code:
                                employeeCode
                        }
                    );


            if (provisionError) {
                console.error(
                    "User provisioning failed:",
                    provisionError
                );


                /*
                 * Compensating cleanup:
                 * do not leave an orphan Auth user.
                 */

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


            return Response.json(
                {
                    success: true,

                    user: {
                        id:
                            newUserId,

                        loginId,

                        displayName,

                        roleCode,

                        employeeCode
                    }
                },
                {
                    status: 201
                }
            );
        }
    )
};
