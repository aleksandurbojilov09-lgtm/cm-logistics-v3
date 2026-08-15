import "./admin-page.css";

import {
    logoutCurrentSession
} from "../../features/auth/logout";


const ADMIN_VIEW_STORAGE_KEY =
    "k3_admin_active_view";


const ADMIN_VIEW_CONFIG = {
    orders: {
        title: "Диспечерски панел",
        subtitle: "Управление на заявки и транспорт",
        label: "Заявки",
        icon: "📦"
    },

    registrations: {
        title: "Клиентски регистрации",
        subtitle: "Одобрение и отказ на нови клиентски фирми",
        label: "Регистрации",
        icon: "🏢"
    },

    discrepancies: {
        title: "Несъответствия",
        subtitle: "Сигнали от шофьори и история по фирми",
        label: "Сигнали",
        icon: "⚠️"
    },

    trips: {
        title: "Активни курсове",
        subtitle: "Следене и редакция на маршрутите",
        label: "Курсове",
        icon: "🗺️"
    },

    drivers: {
        title: "Шофьори",
        subtitle: "Управление на шофьори",
        label: "Шофьори",
        icon: "👨‍✈️"
    },

    fleet: {
        title: "Виртуален гараж",
        subtitle: "Камиони, ремаркета и композиции",
        label: "Гараж",
        icon: "🚛"
    },

    archive: {
        title: "Архив",
        subtitle: "Приключени курсове и история",
        label: "Архив",
        icon: "📊"
    }
} as const;


type AdminView =
    keyof typeof ADMIN_VIEW_CONFIG;


type AdminSectionModule = {
    renderSection: () =>
        string | Promise<string>;

    initializeSection?: () =>
        void | Promise<void>;
};


const adminSectionModules =
    import.meta.glob<AdminSectionModule>(
        "./sections/*-section.ts"
    );


let activeView: AdminView =
    "orders";


let sectionRenderVersion =
    0;


/* ============================================
   HELPERS
   ============================================ */


function isAdminView(
    value: unknown
): value is AdminView {
    return (
        typeof value === "string" &&
        value in ADMIN_VIEW_CONFIG
    );
}


function getSavedAdminView():
    AdminView {
    try {
        const saved =
            sessionStorage.getItem(
                ADMIN_VIEW_STORAGE_KEY
            );

        if (isAdminView(saved)) {
            return saved;
        }
    } catch {
        // UI preference only.
    }

    return "orders";
}


function saveAdminView(
    view: AdminView
): void {
    try {
        sessionStorage.setItem(
            ADMIN_VIEW_STORAGE_KEY,
            view
        );
    } catch {
        // UI preference only.
    }
}


function getSectionModulePath(
    view: AdminView
): string {
    return (
        `./sections/${view}-section.ts`
    );
}


async function loadSectionModule(
    view: AdminView
): Promise<AdminSectionModule | null> {
    const modulePath =
        getSectionModulePath(view);

    const loader =
        adminSectionModules[modulePath];

    if (!loader) {
        return null;
    }

    const sectionModule =
        await loader();

    if (
        typeof sectionModule.renderSection !==
        "function"
    ) {
        throw new Error(
            `K3 Logistics: ${modulePath} must export renderSection().`
        );
    }

    return sectionModule;
}


/* ============================================
   NAVIGATION HTML
   ============================================ */


function renderDesktopNavigation():
    string {
    return (
        Object.entries(
            ADMIN_VIEW_CONFIG
        )
            .map(
                ([view, config]) => `
                    <button
                        type="button"
                        class="admin-nav-button"
                        data-admin-view="${view}"
                    >
                        ${config.icon}
                        ${config.label}
                    </button>
                `
            )
            .join("")
    );
}


function renderMobileNavigation():
    string {
    return (
        Object.entries(
            ADMIN_VIEW_CONFIG
        )
            .map(
                ([view, config]) => `
                    <button
                        type="button"
                        class="admin-mobile-nav-button"
                        data-admin-view="${view}"
                        aria-label="${config.label}"
                    >
                        <span
                            class="admin-mobile-nav-icon"
                        >
                            ${config.icon}
                        </span>

                        ${config.label}
                    </button>
                `
            )
            .join("")
    );
}


/* ============================================
   FALLBACK SECTIONS
   ============================================ */


function renderOrdersFallback():
    string {
    return `
        <div class="admin-stats">

            <article class="admin-stat-card">
                <div class="admin-stat-label">
                    Незавършени заявки
                </div>

                <div class="admin-stat-value">
                    —
                </div>
            </article>

            <article class="admin-stat-card">
                <div class="admin-stat-label">
                    Активни курсове
                </div>

                <div class="admin-stat-value">
                    —
                </div>
            </article>

            <article class="admin-stat-card">
                <div class="admin-stat-label">
                    Шофьори
                </div>

                <div class="admin-stat-value">
                    —
                </div>
            </article>

            <article class="admin-stat-card">
                <div class="admin-stat-label">
                    Камиони
                </div>

                <div class="admin-stat-value">
                    —
                </div>
            </article>

        </div>

        <section class="admin-content-card">

            <header
                class="admin-content-card-header"
            >
                <h3>
                    📦 Заявки
                </h3>

                <p>
                    Тук ще се зареждат
                    актуалните клиентски заявки.
                </p>
            </header>

            <div class="admin-placeholder">
                Модулът „Заявки“ е готов
                за свързване със Supabase.
            </div>

        </section>
    `;
}


function renderGenericFallback(
    view: Exclude<AdminView, "orders">
): string {
    const config =
        ADMIN_VIEW_CONFIG[view];

    return `
        <section class="admin-content-card">

            <header
                class="admin-content-card-header"
            >
                <h3>
                    ${config.icon}
                    ${config.label}
                </h3>

                <p>
                    ${config.subtitle}
                </p>
            </header>

            <div class="admin-placeholder">
                Модулът „${config.label}“
                ще се зарежда автоматично,
                когато бъде добавен.
            </div>

        </section>
    `;
}


function renderFallbackSection(
    view: AdminView
): string {
    if (view === "orders") {
        return renderOrdersFallback();
    }

    return renderGenericFallback(view);
}


/* ============================================
   PAGE
   ============================================ */


export function renderPage(): string {
    return `
        <div class="admin-page">

            <div class="admin-layout">

                <aside class="admin-sidebar">

                    <div class="admin-brand">

                        <div class="admin-brand-logo">
                            K3
                        </div>

                        <h1>
                            K3 Logistics
                        </h1>

                        <p>
                            Администрация
                        </p>

                    </div>


                    <nav
                        class="admin-nav"
                        aria-label="Администрация"
                    >
                        ${renderDesktopNavigation()}
                    </nav>


                    <div
                        class="admin-sidebar-footer"
                    >
                        <button
                            type="button"
                            class="admin-logout-button"
                            data-admin-logout
                        >
                            🚪 Изход
                        </button>
                    </div>

                </aside>


                <main class="admin-main">

                    <header class="admin-header">

                        <div
                            class="admin-header-text"
                        >
                            <h2
                                id="adminPageTitle"
                            >
                                Диспечерски панел
                            </h2>

                            <p
                                id="adminPageSubtitle"
                            >
                                Управление на заявки
                                и транспорт
                            </p>
                        </div>


                        <div class="admin-user-card">

                            <div
                                class="admin-user-card-label"
                            >
                                Влязъл като
                            </div>

                            <div
                                class="admin-user-card-name"
                            >
                                Администратор
                            </div>

                        </div>

                    </header>


                    <section
                        id="adminSectionHost"
                        aria-live="polite"
                    >
                    </section>

                </main>

            </div>


            <nav
                class="admin-mobile-nav"
                aria-label="Администрация"
            >
                ${renderMobileNavigation()}
            </nav>

        </div>
    `;
}


/* ============================================
   VISUAL STATE
   ============================================ */


function updateNavigationState(
    view: AdminView
): void {
    const buttons =
        document.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-admin-view]"
        );

    buttons.forEach(
        (button) => {
            const isActive =
                button.dataset.adminView ===
                view;

            button.classList.toggle(
                "admin-nav-button-active",
                isActive
            );

            button.classList.toggle(
                "admin-mobile-nav-button-active",
                isActive
            );

            if (isActive) {
                button.setAttribute(
                    "aria-current",
                    "page"
                );
            } else {
                button.removeAttribute(
                    "aria-current"
                );
            }
        }
    );
}


function updateHeader(
    view: AdminView
): void {
    const config =
        ADMIN_VIEW_CONFIG[view];

    const title =
        document.querySelector<
            HTMLHeadingElement
        >(
            "#adminPageTitle"
        );

    const subtitle =
        document.querySelector<
            HTMLParagraphElement
        >(
            "#adminPageSubtitle"
        );

    if (title) {
        title.textContent =
            config.title;
    }

    if (subtitle) {
        subtitle.textContent =
            config.subtitle;
    }
}


/* ============================================
   OPEN VIEW
   ============================================ */


async function openAdminView(
    view: AdminView
): Promise<void> {
    activeView =
        view;

    saveAdminView(
        activeView
    );

    updateNavigationState(
        activeView
    );

    updateHeader(
        activeView
    );

    const host =
        document.querySelector<
            HTMLElement
        >(
            "#adminSectionHost"
        );

    if (!host) {
        return;
    }

    const currentRender =
        ++sectionRenderVersion;

    host.innerHTML = `
        <div class="admin-placeholder">
            Зареждане...
        </div>
    `;

    try {
        const sectionModule =
            await loadSectionModule(
                activeView
            );

        if (
            currentRender !==
            sectionRenderVersion
        ) {
            return;
        }

        if (!sectionModule) {
            host.innerHTML =
                renderFallbackSection(
                    activeView
                );

            return;
        }

        host.innerHTML =
            await sectionModule
                .renderSection();

        if (
            currentRender !==
            sectionRenderVersion
        ) {
            return;
        }

        await sectionModule
            .initializeSection?.();

    } catch {
        if (
            currentRender !==
            sectionRenderVersion
        ) {
            return;
        }

        host.innerHTML = `
            <section
                class="admin-content-card"
            >
                <div
                    class="admin-placeholder"
                >
                    Модулът не можа
                    да бъде зареден.
                </div>
            </section>
        `;
    }
}


/* ============================================
   EVENTS
   ============================================ */


function initializeNavigation():
    void {
    const buttons =
        document.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-admin-view]"
        );

    buttons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    const view =
                        button.dataset
                            .adminView;

                    if (!isAdminView(view)) {
                        return;
                    }

                    void openAdminView(
                        view
                    );
                }
            );
        }
    );
}


function initializeLogout():
    void {
    const buttons =
        document.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-admin-logout]"
        );

    buttons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                async () => {
                    button.disabled =
                        true;

                    const oldText =
                        button.textContent;

                    button.textContent =
                        "⏳ Излизане...";

                    try {
                        await logoutCurrentSession();

                        /*
                         * Central Router listens
                         * for SIGNED_OUT and opens
                         * the Login page automatically.
                         */
                    } catch {
                        window.alert(
                            "Неуспешен изход. Опитайте отново."
                        );

                        button.disabled =
                            false;

                        button.textContent =
                            oldText;
                    }
                }
            );
        }
    );
}


/* ============================================
   INITIALIZE
   ============================================ */


export async function initializePage():
    Promise<void> {
    initializeNavigation();

    initializeLogout();

    const initialView =
        getSavedAdminView();

    await openAdminView(
        initialView
    );
}
