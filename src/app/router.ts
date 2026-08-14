import {
    initializeLoginPage,
    renderLoginPage
} from "../pages/login/login-page";

import {
    getCurrentUserRole,
    type UserRole
} from "../features/auth/get-current-role";

import {
    supabase
} from "../shared/api/supabase";

export type AppRoute =
    | "login"
    | "admin"
    | "dispatcher"
    | "driver"
    | "client";

type PortalRoute =
    Exclude<AppRoute, "login">;

type AuthState =
    | {
        kind: "guest";
    }
    | {
        kind: "authenticated";
        route: PortalRoute;
    }
    | {
        kind: "missing-role";
    };

let routerStarted = false;

function getAppRoot(): HTMLDivElement {
    const app =
        document.querySelector<HTMLDivElement>(
            "#app"
        );

    if (!app) {
        throw new Error(
            "K3 Logistics: #app root element was not found."
        );
    }

    return app;
}

function getRouteFromHash(): AppRoute {
    const route =
        window.location.hash
            .replace("#/", "")
            .trim()
            .toLowerCase();

    switch (route) {
        case "admin":
        case "dispatcher":
        case "driver":
        case "client":
            return route;

        default:
            return "login";
    }
}

function getPortalRouteForRole(
    role: UserRole
): PortalRoute {
    return role;
}

function renderTemporaryPortal(
    route: PortalRoute
): string {
    const labels: Record<
        PortalRoute,
        string
    > = {
        admin: "Администратор",
        dispatcher: "Диспечер",
        driver: "Шофьор",
        client: "Клиент"
    };

    return `
        <main>
            <h1>K3 Logistics</h1>
            <p>${labels[route]}</p>
        </main>
    `;
}

function renderMissingRolePage(): string {
    return `
        <main>
            <h1>K3 Logistics</h1>

            <p>
                Потребителят няма зададена
                основна роля.
            </p>
        </main>
    `;
}

function renderAuthErrorPage(): string {
    return `
        <main>
            <h1>K3 Logistics</h1>

            <p>
                Възникна грешка при проверка
                на потребителя.
            </p>
        </main>
    `;
}

async function resolveAuthState():
    Promise<AuthState> {
    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error || !data.user) {
        return {
            kind: "guest"
        };
    }

    const role =
        await getCurrentUserRole();

    if (!role) {
        return {
            kind: "missing-role"
        };
    }

    return {
        kind: "authenticated",
        route: getPortalRouteForRole(role)
    };
}

export function navigateTo(
    route: AppRoute
): void {
    const nextHash =
        `#/${route}`;

    if (
        window.location.hash ===
        nextHash
    ) {
        void renderCurrentRoute();
        return;
    }

    window.location.hash =
        nextHash;
}

export async function renderCurrentRoute():
    Promise<void> {
    const app =
        getAppRoot();

    const requestedRoute =
        getRouteFromHash();

    let authState: AuthState;

    try {
        authState =
            await resolveAuthState();
    } catch {
        app.innerHTML =
            renderAuthErrorPage();

        return;
    }

    if (authState.kind === "guest") {
        if (requestedRoute !== "login") {
            navigateTo("login");
            return;
        }

        app.innerHTML =
            renderLoginPage();

        initializeLoginPage();

        return;
    }

    if (
        authState.kind ===
        "missing-role"
    ) {
        app.innerHTML =
            renderMissingRolePage();

        return;
    }

    if (
        requestedRoute !==
        authState.route
    ) {
        navigateTo(
            authState.route
        );

        return;
    }

    app.innerHTML =
        renderTemporaryPortal(
            authState.route
        );
}

export function startRouter(): void {
    if (routerStarted) {
        return;
    }

    routerStarted = true;

    window.addEventListener(
        "hashchange",
        () => {
            void renderCurrentRoute();
        }
    );

    supabase.auth.onAuthStateChange(
        (event) => {
            if (
                event !== "INITIAL_SESSION" &&
                event !== "SIGNED_IN" &&
                event !== "SIGNED_OUT" &&
                event !== "USER_UPDATED"
            ) {
                return;
            }

            window.setTimeout(
                () => {
                    void renderCurrentRoute();
                },
                0
            );
        }
    );

    void renderCurrentRoute();
}
