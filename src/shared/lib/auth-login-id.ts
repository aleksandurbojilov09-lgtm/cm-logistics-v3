const AUTH_EMAIL_DOMAIN = "auth.k3.invalid";

export function normalizeLoginId(loginId: string): string {
    return loginId.trim().toLowerCase();
}

export function loginIdToAuthEmail(loginId: string): string {
    const normalizedLoginId =
        normalizeLoginId(loginId);

    if (!normalizedLoginId) {
        throw new Error(
            "K3 Logistics: login ID is required."
        );
    }

    return `${normalizedLoginId}@${AUTH_EMAIL_DOMAIN}`;
}
