import "./login-page.css";

import {
    getRememberedLoginId
} from "../../shared/lib/login-preferences";

export function renderLoginPage(): string {
    return `
        <main class="login-page">
            <div class="login-container">

                <header class="login-brand">
                    <div class="login-brand-icon" aria-hidden="true">
                        <svg
                            viewBox="0 0 360 220"
                            role="img"
                            aria-label="K3 logo"
                            style="
                                display: block;
                                width: 220px;
                                max-width: 100%;
                                height: auto;
                                margin: 0 auto;
                            "
                        >
                            <rect
                                x="8"
                                y="8"
                                width="344"
                                height="204"
                                rx="6"
                                fill="#f97316"
                                stroke="#e2e8f0"
                                stroke-width="4"
                            />

                            <text
                                x="62"
                                y="156"
                                fill="#111827"
                                font-size="142"
                                font-family="Arial, Helvetica, sans-serif"
                                font-weight="700"
                            >
                                K3
                            </text>
                        </svg>
                    </div>

                    <h1>K3 Logistics</h1>

                    <p>Диспечерска система</p>
                </header>

                <div class="login-card">

                    <div class="login-tabs">
                        <button
                            id="loginTab"
                            class="login-tab login-tab-active"
                            type="button"
                        >
                            🔑 Вход
                        </button>

                        <button
                            id="registerTab"
                            class="login-tab"
                            type="button"
                        >
                            🏢 Регистрация на фирма
                        </button>
                    </div>

                    <section
                        id="loginSection"
                        class="login-section"
                    >
                        <div class="login-form-container">

                            <h2>Вход в системата</h2>

                            <p class="login-description">
                                За администратор, диспечери, шофьори и клиенти
                            </p>

                            <form
                                id="loginForm"
                                class="login-form"
                            >
                                <div class="login-field">
                                    <label for="loginUsername">
                                        Потребителско ID
                                    </label>

                                    <input
                                        id="loginUsername"
                                        name="username"
                                        type="text"
                                        autocomplete="username"
                                        placeholder="Въведете ID"
                                        required
                                    />
                                </div>

                                <div class="login-field">
                                    <label for="loginPassword">
                                        Парола
                                    </label>

                                    <input
                                        id="loginPassword"
                                        name="password"
                                        type="password"
                                        autocomplete="current-password"
                                        placeholder="Въведете парола"
                                        required
                                    />
                                </div>

                                <label class="remember-me">
                                    <input
                                        id="rememberMe"
                                        type="checkbox"
                                    />

                                    <span>Запомни ме</span>
                                </label>

                                <div
                                    id="loginMessage"
                                    class="login-message"
                                    aria-live="polite"
                                ></div>

                                <button
                                    id="loginButton"
                                    class="login-button"
                                    type="submit"
                                >
                                    🔑 Вход
                                </button>
                            </form>

                        </div>
                    </section>

                </div>

            </div>
        </main>
    `;
}

export function initializeLoginPage(): void {
    const usernameInput =
        document.querySelector<HTMLInputElement>(
            "#loginUsername"
        );

    const rememberMeInput =
        document.querySelector<HTMLInputElement>(
            "#rememberMe"
        );

    if (!usernameInput || !rememberMeInput) {
        return;
    }

    const rememberedLoginId =
        getRememberedLoginId();

    if (!rememberedLoginId) {
        return;
    }

    usernameInput.value =
        rememberedLoginId;

    rememberMeInput.checked =
        true;
}
