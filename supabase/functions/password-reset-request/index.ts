import {
    withSupabase
} from "npm:@supabase/server@^1";
import type {
    EdgeDatabase
} from "../_shared/database-contract.ts";


type JsonRecord =
    Record<string, unknown>;


const SUCCESS_MESSAGE =
    "Ако това ID съществува и има право на възстановяване, заявката е изпратена към администратор или диспечер.";


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


function successResponse():
Response {
    return Response.json({
        success: true,
        message:
            SUCCESS_MESSAGE
    });
}


function serverError():
Response {
    return Response.json(
        {
            success: false,
            message:
                "Заявката не можа да бъде изпратена. Опитайте отново."
        },
        {
            status: 500
        }
    );
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
                return Response.json(
                    {
                        success: false,
                        message:
                            "Методът не е позволен."
                    },
                    {
                        status: 405
                    }
                );
            }


            let body:
                unknown;


            try {
                body =
                    await request.json();
            } catch {
                return successResponse();
            }


            if (!isRecord(body)) {
                return successResponse();
            }


            const loginId =
                textValue(
                    body.loginId
                )
                    .toLowerCase();


            if (
                !/^[a-z0-9][a-z0-9._-]{2,31}$/
                    .test(loginId)
            ) {
                return successResponse();
            }


            const {
                data: profile,
                error: profileError
            } =
                await context
                    .supabaseAdmin
                    .from("profiles")
                    .select(
                        `
                        id,
                        login_id,
                        is_active
                        `
                    )
                    .ilike(
                        "login_id",
                        loginId
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .maybeSingle();


            if (profileError) {
                console.error(
                    "Password reset profile lookup failed:",
                    profileError
                );

                return serverError();
            }


            if (!profile) {
                return successResponse();
            }


            const {
                data: roleLink,
                error: roleLinkError
            } =
                await context
                    .supabaseAdmin
                    .from("user_roles")
                    .select("role_id")
                    .eq(
                        "user_id",
                        profile.id
                    )
                    .eq(
                        "is_primary",
                        true
                    )
                    .limit(1)
                    .maybeSingle();


            if (
                roleLinkError ||
                !roleLink
            ) {
                return successResponse();
            }


            const {
                data: role,
                error: roleError
            } =
                await context
                    .supabaseAdmin
                    .from("roles")
                    .select("code")
                    .eq(
                        "id",
                        roleLink.role_id
                    )
                    .maybeSingle();


            if (roleError) {
                console.error(
                    "Password reset role lookup failed:",
                    roleError
                );

                return serverError();
            }


            const roleCode =
                typeof role?.code ===
                    "string"
                    ? role.code
                    : "";


            if (
                roleCode !== "client" &&
                roleCode !== "driver"
            ) {
                return successResponse();
            }


            if (
                roleCode === "client"
            ) {

                const {
                    data: clientLinks,
                    error: clientLinksError
                } =
                    await context
                        .supabaseAdmin
                        .from("client_users")
                        .select("company_id")
                        .eq(
                            "user_id",
                            profile.id
                        )
                        .limit(50);


                if (
                    clientLinksError ||
                    !clientLinks?.length
                ) {
                    return successResponse();
                }


                const companyIds =
                    clientLinks
                        .map(
                            link =>
                                typeof link.company_id ===
                                    "string"
                                    ? link.company_id
                                    : ""
                        )
                        .filter(Boolean);


                if (!companyIds.length) {
                    return successResponse();
                }


                const {
                    data: company,
                    error: companyError
                } =
                    await context
                        .supabaseAdmin
                        .from("client_companies")
                        .select("id")
                        .in(
                            "id",
                            companyIds
                        )
                        .eq(
                            "is_active",
                            true
                        )
                        .limit(1)
                        .maybeSingle();


                if (companyError) {
                    console.error(
                        "Password reset company lookup failed:",
                        companyError
                    );

                    return serverError();
                }


                if (
                    !company
                ) {
                    return successResponse();
                }
            }


            const {
                data: recent,
                error: recentError
            } =
                await context
                    .supabaseAdmin
                    .from(
                        "password_reset_requests"
                    )
                    .select(
                        `
                        id,
                        status,
                        requested_at,
                        reviewed_at,
                        completed_at,
                        updated_at
                        `
                    )
                    .eq(
                        "user_id",
                        profile.id
                    )
                    .order(
                        "requested_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1)
                    .maybeSingle();


            if (recentError) {
                console.error(
                    "Password reset recent lookup failed:",
                    recentError
                );

                return serverError();
            }


            if (recent) {

                if (
                    recent.status === "pending" ||
                    recent.status === "processing"
                ) {
                    return successResponse();
                }


                const cooldownTimestamp =
                    recent.status ===
                        "completed"
                        ? recent.completed_at
                        : recent.status ===
                            "rejected"
                            ? recent.reviewed_at
                            : recent.updated_at;


                const lastHandledAt =
                    Date.parse(
                        cooldownTimestamp ||
                        recent.requested_at
                    );


                if (
                    Number.isFinite(
                        lastHandledAt
                    ) &&
                    Date.now() -
                        lastHandledAt <
                        10 * 60 * 1000
                ) {
                    return successResponse();
                }
            }


            const {
                error: insertError
            } =
                await context
                    .supabaseAdmin
                    .from(
                        "password_reset_requests"
                    )
                    .insert({
                        user_id:
                            profile.id,

                        login_id_snapshot:
                            loginId,

                        status:
                            "pending"
                    });


            if (insertError) {

                if (
                    insertError.code ===
                        "23505"
                ) {
                    return successResponse();
                }


                console.error(
                    "Password reset insert failed:",
                    insertError
                );

                return serverError();
            }


            return successResponse();
        }
    )
};
