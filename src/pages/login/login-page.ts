export function renderLoginPage(): string {
    return `
        <main class="login-page">
            <section class="login-card">
                <header class="login-header">
                    <h1>CM Logistics</h1>
                    <p>Вход в системата</p>
                </header>

                <form id="loginForm" class="login-form">
                    <label for="loginId">
                        Потребител
                    </label>

                    <input
                        id="loginId"
                        name="username"
                        type="text"
                        autocomplete="username"
                        required
                    />

                    <label for="loginPassword">
                        Парола
                    </label>

                    <input
                        id="loginPassword"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        required
                    />

                    <label class="remember-me">
                        <input
                            id="rememberMe"
                            type="checkbox"
                        />

                        <span>Запомни ме</span>
                    </label>

                    <button type="submit">
                        Вход
                    </button>
                </form>

                <p
                    id="loginMessage"
                    class="login-message"
                    aria-live="polite"
                ></p>
            </section>
        </main>
    `;
}
