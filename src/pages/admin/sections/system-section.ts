import "./system-section.css";

import {
    createDispatcherAccount
} from "../../../features/users/admin-user-service";


function getRoot():
    HTMLElement | null {

    return document.querySelector(
        "#k3SystemSection"
    );
}


function errorMessage(
    error: unknown
): string {

    if (
        error instanceof Error &&
        error.message
    ) {
        return error.message;
    }

    return "Възникна неочаквана грешка.";
}


function setMessage(
    message: string,
    type:
        | "success"
        | "error"
        | ""
): void {

    const root =
        getRoot();

    const element =
        root?.querySelector<
            HTMLElement
        >(
            "#k3DispatcherFormMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.dataset.state =
        type;
}


function togglePasswords():
    void {

    const root =
        getRoot();

    const password =
        root?.querySelector<
            HTMLInputElement
        >(
            "#k3DispatcherPassword"
        );

    const confirmation =
        root?.querySelector<
            HTMLInputElement
        >(
            "#k3DispatcherPasswordConfirm"
        );

    const button =
        root?.querySelector<
            HTMLButtonElement
        >(
            '[data-system-action="toggle-password"]'
        );

    if (
        !password ||
        !confirmation ||
        !button
    ) {
        return;
    }

    const show =
        password.type ===
        "password";

    password.type =
        show
            ? "text"
            : "password";

    confirmation.type =
        show
            ? "text"
            : "password";

    button.textContent =
        show
            ? "🙈"
            : "👁";

    button.setAttribute(
        "aria-label",
        show
            ? "Скрий паролите"
            : "Покажи паролите"
    );
}


export function renderSection():
    string {

    return `
        <section
            id="k3SystemSection"
            class="system-users-section"
        >

            <div
                class="system-users-layout"
            >

                <section
                    class="system-users-panel"
                >

                    <header
                        class="system-users-header"
                    >
                        <div>
                            <span
                                class="system-users-kicker"
                            >
                                ADMIN ONLY
                            </span>

                            <h3>
                                👔 Нов диспечер
                            </h3>

                            <p>
                                Създава оперативен
                                ръководител с отделен
                                защитен вход.
                            </p>
                        </div>
                    </header>


                    <form
                        id="k3DispatcherForm"
                        class="system-users-form"
                    >

                        <label>
                            Име

                            <input
                                id="k3DispatcherName"
                                type="text"
                                autocomplete="name"
                                required
                                maxlength="120"
                                placeholder="Иван Иванов"
                            />
                        </label>


                        <label>
                            Телефон

                            <input
                                id="k3DispatcherPhone"
                                type="tel"
                                autocomplete="tel"
                                required
                                maxlength="40"
                                placeholder="+359..."
                            />
                        </label>


                        <label>
                            Потребителско ID

                            <input
                                id="k3DispatcherLoginId"
                                type="text"
                                autocomplete="off"
                                required
                                minlength="3"
                                maxlength="32"
                                pattern="[A-Za-z0-9._-]+"
                                autocapitalize="none"
                                spellcheck="false"
                                placeholder="dispatcher01"
                            />

                            <small>
                                3–32 символа:
                                латински букви,
                                цифри, точка,
                                тире или _.
                            </small>
                        </label>


                        <label>
                            Нова парола

                            <div
                                class="system-password-row"
                            >
                                <input
                                    id="k3DispatcherPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    required
                                    minlength="8"
                                    placeholder="Минимум 8 символа"
                                />

                                <button
                                    type="button"
                                    class="system-password-toggle"
                                    data-system-action="toggle-password"
                                    aria-label="Покажи паролите"
                                >
                                    👁
                                </button>
                            </div>
                        </label>


                        <label>
                            Потвърди паролата

                            <input
                                id="k3DispatcherPasswordConfirm"
                                type="password"
                                autocomplete="new-password"
                                required
                                minlength="8"
                                placeholder="Повтори паролата"
                            />
                        </label>


                        <div
                            id="k3DispatcherFormMessage"
                            class="system-form-message"
                            aria-live="polite"
                        ></div>


                        <button
                            id="k3DispatcherSubmit"
                            type="submit"
                            class="system-submit-button"
                        >
                            ➕ Създай диспечер
                        </button>

                    </form>

                </section>


                <aside
                    class="system-users-panel system-info-panel"
                >
                    <header
                        class="system-users-header"
                    >
                        <h3>
                            🔐 Права на профила
                        </h3>

                        <p>
                            Диспечерът управлява
                            ежедневната работа,
                            но не системната
                            администрация.
                        </p>
                    </header>

                    <div
                        class="system-info-list"
                    >
                        <div>
                            <strong>
                                Има достъп
                            </strong>
                            <span>
                                Заявки, регистрации,
                                сигнали, курсове,
                                шофьори, гараж,
                                архив и BIOEXIS.
                            </span>
                        </div>

                        <div>
                            <strong>
                                Няма достъп
                            </strong>
                            <span>
                                Admin-only „Система“,
                                RBAC и техническите
                                функции за сигурност.
                            </span>
                        </div>

                        <div>
                            <strong>
                                Паролата
                            </strong>
                            <span>
                                Не се записва в
                                бизнес таблиците и
                                не се показва след
                                създаването.
                            </span>
                        </div>
                    </div>
                </aside>

            </div>

        </section>
    `;
}


export async function initializeSection():
    Promise<void> {

    const root =
        getRoot();

    if (!root) {
        return;
    }


    root
        .querySelector<
            HTMLButtonElement
        >(
            '[data-system-action="toggle-password"]'
        )
        ?.addEventListener(
            "click",
            togglePasswords
        );


    const form =
        root.querySelector<
            HTMLFormElement
        >(
            "#k3DispatcherForm"
        );

    const submitButton =
        root.querySelector<
            HTMLButtonElement
        >(
            "#k3DispatcherSubmit"
        );

    if (
        !form ||
        !submitButton
    ) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            setMessage(
                "",
                ""
            );


            const name =
                root.querySelector<
                    HTMLInputElement
                >(
                    "#k3DispatcherName"
                )?.value.trim() || "";

            const phone =
                root.querySelector<
                    HTMLInputElement
                >(
                    "#k3DispatcherPhone"
                )?.value.trim() || "";

            const loginId =
                root.querySelector<
                    HTMLInputElement
                >(
                    "#k3DispatcherLoginId"
                )?.value.trim()
                    .toLowerCase() || "";

            const password =
                root.querySelector<
                    HTMLInputElement
                >(
                    "#k3DispatcherPassword"
                )?.value || "";

            const confirmation =
                root.querySelector<
                    HTMLInputElement
                >(
                    "#k3DispatcherPasswordConfirm"
                )?.value || "";


            if (
                password !==
                confirmation
            ) {
                setMessage(
                    "Двете пароли не съвпадат.",
                    "error"
                );

                return;
            }


            submitButton.disabled =
                true;

            submitButton.textContent =
                "⏳ Създаване...";


            try {

                await createDispatcherAccount(
                    {
                        displayName:
                            name,

                        phone,

                        loginId,

                        password
                    }
                );


                form.reset();

                setMessage(
                    `Диспечер ${loginId} е създаден успешно.`,
                    "success"
                );

            } catch (error) {

                setMessage(
                    errorMessage(
                        error
                    ),
                    "error"
                );

            } finally {

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "➕ Създай диспечер";
            }
        }
    );
}
