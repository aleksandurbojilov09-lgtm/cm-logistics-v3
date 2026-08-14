import {
    initializeLoginPage,
    renderLoginPage
} from "../pages/login/login-page";

export type AppRoute =
    | "login"
    | "admin"
    | "dispatcher"
    | "driver"
    | "client";

function getAppRoot(): HTMLDivElement {
    const app =
        document.querySelector<HTMLDivElement>("#app");

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

function renderTemporaryPortal(
    route: Exclude<AppRoute, "login">
): string {
    const labels = {
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

export function navigateTo(
    route: AppRoute
): void {
    const nextHash = `#/${route}`;

    if (window.location.hash === nextHash) {
        renderCurrentRoute();
        return;
    }

    window.location.hash = nextHash;
}

export function renderCurrentRoute(): void {
    const app = getAppRoot();
    const route = getRouteFromHash();

    if (route === "login") {
        app.innerHTML = renderLoginPage();
        initializeLoginPage();
        return;
    }

    app.innerHTML =
        renderTemporaryPortal(route);
}

export function startRouter(): void {
    window.addEventListener(
        "hashchange",
        renderCurrentRoute
    );

    renderCurrentRoute();
}
