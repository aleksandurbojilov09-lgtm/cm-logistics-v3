import {
    supabase
} from "../../shared/api/supabase";


export type ClientCompany = {
    id: string;
    companyName: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    registeredAddress: string | null;
    isActive: boolean;
};


export type ClientSite = {
    id: string;
    companyId: string;
    siteName: string;
    address: string;
    contactPerson: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
};


export type ClientAccount = {
    userId: string;
    companyId: string;
    isPrimary: boolean;
    displayName: string;
    phone: string | null;
    loginId: string;
    isActive: boolean;
};


export type ClientManagementSnapshot = {
    companies: ClientCompany[];
    sites: ClientSite[];
    accounts: ClientAccount[];
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
    return (
        typeof value === "string" &&
        value.trim()
    )
        ? value
        : null;
}


function numberValue(
    value: unknown
): number | null {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : null;
}


function rpcError(
    message: string | undefined,
    fallback: string
): Error {
    return new Error(
        message?.trim() ||
        fallback
    );
}


export async function
loadClientManagementSnapshot():
Promise<ClientManagementSnapshot> {

    const [
        companiesResult,
        sitesResult,
        linksResult
    ] =
        await Promise.all([

            supabase
                .from(
                    "client_companies"
                )
                .select(
                    `
                    id,
                    company_name,
                    contact_person,
                    phone,
                    email,
                    registered_address,
                    is_active
                    `
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "company_name"
                ),

            supabase
                .from(
                    "client_sites"
                )
                .select(
                    `
                    id,
                    company_id,
                    site_name,
                    address,
                    contact_person,
                    phone,
                    latitude,
                    longitude,
                    is_active
                    `
                )
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "site_name"
                ),

            supabase
                .from(
                    "client_users"
                )
                .select(
                    `
                    user_id,
                    company_id,
                    is_primary
                    `
                )
        ]);


    if (companiesResult.error) {
        throw rpcError(
            companiesResult.error.message,
            "Фирмите не можаха да бъдат заредени."
        );
    }


    if (sitesResult.error) {
        throw rpcError(
            sitesResult.error.message,
            "Обектите не можаха да бъдат заредени."
        );
    }


    if (linksResult.error) {
        throw rpcError(
            linksResult.error.message,
            "Клиентските акаунти не можаха да бъдат заредени."
        );
    }


    const companies:
        ClientCompany[] =
        [];


    for (
        const row
        of companiesResult.data || []
    ) {
        if (!isRecord(row)) {
            continue;
        }

        const id =
            stringValue(row.id);

        const companyName =
            stringValue(
                row.company_name
            );

        if (
            !id ||
            !companyName
        ) {
            continue;
        }

        companies.push({
            id,

            companyName,

            contactPerson:
                nullableString(
                    row.contact_person
                ),

            phone:
                nullableString(
                    row.phone
                ),

            email:
                nullableString(
                    row.email
                ),

            registeredAddress:
                nullableString(
                    row.registered_address
                ),

            isActive:
                row.is_active === true
        });
    }


    const sites:
        ClientSite[] =
        [];


    for (
        const row
        of sitesResult.data || []
    ) {
        if (!isRecord(row)) {
            continue;
        }

        const id =
            stringValue(row.id);

        const companyId =
            stringValue(
                row.company_id
            );

        const siteName =
            stringValue(
                row.site_name
            );

        const address =
            stringValue(
                row.address
            );

        if (
            !id ||
            !companyId ||
            !siteName ||
            !address
        ) {
            continue;
        }

        sites.push({
            id,

            companyId,

            siteName,

            address,

            contactPerson:
                nullableString(
                    row.contact_person
                ),

            phone:
                nullableString(
                    row.phone
                ),

            latitude:
                numberValue(
                    row.latitude
                ),

            longitude:
                numberValue(
                    row.longitude
                ),

            isActive:
                row.is_active === true
        });
    }


    const links =
        (
            linksResult.data || []
        )
            .filter(
                isRecord
            );


    const userIds =
        [
            ...new Set(
                links
                    .map(
                        row =>
                            stringValue(
                                row.user_id
                            )
                    )
                    .filter(Boolean)
            )
        ];


    const profilesById =
        new Map<
            string,
            JsonRecord
        >();


    if (userIds.length > 0) {

        const {
            data: profiles,
            error: profilesError
        } =
            await supabase
                .from("profiles")
                .select(
                    `
                    id,
                    display_name,
                    phone,
                    login_id,
                    is_active
                    `
                )
                .in(
                    "id",
                    userIds
                );


        if (profilesError) {
            throw rpcError(
                profilesError.message,
                "Клиентските профили не можаха да бъдат заредени."
            );
        }


        for (
            const profile
            of profiles || []
        ) {
            if (
                !isRecord(profile)
            ) {
                continue;
            }

            const id =
                stringValue(
                    profile.id
                );

            if (id) {
                profilesById.set(
                    id,
                    profile
                );
            }
        }
    }


    const accounts:
        ClientAccount[] =
        [];


    for (const link of links) {

        const userId =
            stringValue(
                link.user_id
            );

        const companyId =
            stringValue(
                link.company_id
            );

        const profile =
            profilesById.get(
                userId
            );


        if (
            !userId ||
            !companyId ||
            !profile ||
            profile.is_active !== true
        ) {
            continue;
        }


        accounts.push({
            userId,

            companyId,

            isPrimary:
                link.is_primary === true,

            displayName:
                stringValue(
                    profile.display_name
                ),

            phone:
                nullableString(
                    profile.phone
                ),

            loginId:
                stringValue(
                    profile.login_id
                ),

            isActive:
                true
        });
    }


    accounts.sort(
        (
            first,
            second
        ) =>
            first.displayName
                .localeCompare(
                    second.displayName,
                    "bg"
                )
    );


    return {
        companies,
        sites,
        accounts
    };
}
