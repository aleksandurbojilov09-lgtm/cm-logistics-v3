const REMEMBERED_LOGIN_ID_KEY = "cm_v3_remembered_login_id";

export function getRememberedLoginId(): string | null {
    const loginId = localStorage.getItem(REMEMBERED_LOGIN_ID_KEY);

    if (!loginId) {
        return null;
    }

    return loginId;
}

export function saveRememberedLoginId(loginId: string): void {
    const normalizedLoginId = loginId.trim().toLowerCase();

    if (!normalizedLoginId) {
        clearRememberedLoginId();
        return;
    }

    localStorage.setItem(
        REMEMBERED_LOGIN_ID_KEY,
        normalizedLoginId
    );
}

export function clearRememberedLoginId(): void {
    localStorage.removeItem(REMEMBERED_LOGIN_ID_KEY);
}
