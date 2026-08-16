import "./drivers-section.css";

import {
    createDriverAccount,
    loadAdminDrivers,
    type AdminDriverListItem
} from "../../../features/users/admin-user-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


let drivers:
    AdminDriverListItem[] =
    [];


let refreshVersion =
    0;


/* =========================================================
   ROOT
   ========================================================= */


function getRoot():
    HTMLElement | null {

    return document.querySelector(
        "#k3DriversSection"
    );
}


/* =========================================================
   HELPERS
   ========================================================= */


function errorMessage(
    error: unknown
): string {

    if (
        error instanceof Error &&
        error.message
    ) {
        return error.message;
    }

    return (
        "Възникна неочаквана грешка."
    );
}


function getCompositionLabel(
    driver: AdminDriverListItem
): string {

    if (
        driver.assignmentMode ===
        "temporary_for_trip"
    ) {
        return (
            driver.currentTruckRegistration
                ? `Временно: ${driver.currentTruckRegistration}`
                : "Временен курс"
        );
    }


    if (
        driver.currentTruckRegistration
    ) {
        return (
            driver.currentTruckRegistration
        );
    }


    if (
        driver.homeTruckRegistration
    ) {
        return (
            driver.homeTruckRegistration
        );
    }


    return "Няма зачислен камион";
}


/* =========================================================
   PAGE
   ========================================================= */


export function renderSection():
    string {

    return `
        <section
            id="k3DriversSection"
            class="drivers-section"
        >

            <div
                id="k3DriversPageMessage"
                class="drivers-page-message"
                aria-live="polite"
            ></div>


            <div
                class="drivers-layout"
            >

                <section
                    class="drivers-panel"
                >

                    <header
                        class="drivers-panel-header"
                    >
                        <h3>
                            ➕ Добави шофьор
                        </h3>

                        <p>
                            Създава шофьор и
                            защитен акаунт за вход.
                        </p>
                    </header>


                    <form
                        id="k3AddDriverForm"
                        class="drivers-form"
                    >

                        <label>
                            Име

                            <input
                                id="k3DriverName"
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
                                id="k3DriverPhone"
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
                                id="k3DriverLoginId"
                                type="text"
                                autocomplete="off"
                                required
                                minlength="3"
                                maxlength="32"
                                pattern="[A-Za-z0-9._-]+"
                                autocapitalize="none"
                                spellcheck="false"
                                placeholder="ivan01"
                            />

                            <small>
                                3–32 символа:
                                латински букви,
                                цифри, точка,
                                тире или _.
                            </small>
                        </label>


                        <label>
                            Парола

                            <div
                                class="
                                    drivers-password-row
                                "
                            >
                                <input
                                    id="k3DriverPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    required
                                    minlength="8"
                                    placeholder="Минимум 8 символа"
                                />

                                <button
                                    type="button"
                                    class="
                                        drivers-password-toggle
                                    "
                                    data-driver-action="toggle-password"
                                    aria-label="Покажи паролата"
                                >
                                    👁
                                </button>
                            </div>
                        </label>


                        <div
                            id="k3DriverFormMessage"
                            class="
                                drivers-form-message
                            "
                            aria-live="polite"
                        ></div>


                        <button
                            id="k3DriverSubmitButton"
                            type="submit"
                            class="
                                drivers-submit-button
                            "
                        >
                            ➕ Добави шофьор
                        </button>

                    </form>

                </section>


                <section
                    class="drivers-panel"
                >

                    <header
                        class="
                            drivers-panel-header
                            drivers-list-header
                        "
                    >
                        <div>
                            <h3>
                                👨‍✈️ Шофьори
                            </h3>

                            <p>
                                Активни шофьори и
                                текущи композиции
                            </p>
                        </div>


                        <span
                            id="k3DriversCount"
                            class="
                                drivers-count-badge
                            "
                        >
                            0
                        </span>
                    </header>


                    <div
                        id="k3DriversList"
                        class="drivers-list"
                    >
                        <div
                            class="
                                drivers-loading
                            "
                        >
                            Зареждане...
                        </div>
                    </div>

                </section>

            </div>

        </section>
    `;
}


/* =========================================================
   MESSAGES
   ========================================================= */


function setFormMessage(
    message: string,
    type:
        | "success"
        | "error"
        | null
): void {

    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriverFormMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "drivers-form-message";


    if (type) {
        element.classList.add(
            `drivers-form-message-${type}`
        );
    }
}


function setPageMessage(
    message: string
): void {

    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriversPageMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.toggle(
        "drivers-page-message-visible",
        Boolean(message)
    );
}


/* =========================================================
   DRIVER LIST
   ========================================================= */


function renderDrivers():
    void {

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriversList"
        );


    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3DriversCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            drivers.length
        );


    if (
        drivers.length === 0
    ) {

        list.innerHTML = `
            <div
                class="drivers-empty"
            >
                Все още няма добавени
                активни шофьори.
            </div>
        `;

        return;
    }


    list.innerHTML =
        drivers
            .map(
                driver =>
                    renderDriverCard(
                        driver
                    )
            )
            .join("");
}


function renderDriverCard(
    driver: AdminDriverListItem
): string {

    const temporary =
        driver.assignmentMode ===
        "temporary_for_trip";


    return `
        <article
            class="driver-card"
        >

            <div
                class="driver-card-main"
            >

                <div
                    class="driver-avatar"
                    aria-hidden="true"
                >
                    👨‍✈️
                </div>


                <div
                    class="
                        driver-card-identity
                    "
                >
                    <strong>
                        ${escapeHtml(
                            driver.displayName
                        )}
                    </strong>

                    <span>
                        ${
                            driver.phone
                                ? `📞 ${escapeHtml(
                                    driver.phone
                                )}`
                                : "📞 Няма телефон"
                        }
                    </span>

                    <span>
                        👤
                        ${escapeHtml(
                            driver.loginId ||
                            "-"
                        )}
                    </span>
                </div>

            </div>


            <div
                class="driver-card-details"
            >

                <div
                    class="driver-detail"
                >
                    <span>
                        🚛 Текущ камион
                    </span>

                    <strong
                        class="${
                            driver.currentTruckRegistration ||
                            driver.homeTruckRegistration
                                ? ""
                                : "driver-detail-warning"
                        }"
                    >
                        ${escapeHtml(
                            getCompositionLabel(
                                driver
                            )
                        )}
                    </strong>
                </div>


                <div
                    class="driver-detail"
                >
                    <span>
                        🛻 Ремарке
                    </span>

                    <strong>
                        ${
                            driver.currentTrailerRegistration
                                ? escapeHtml(
                                    driver.currentTrailerRegistration
                                )
                                : "Няма"
                        }
                    </strong>

                    ${
                        driver.currentTrailerPermit
                            ? `
                                <small
                                    class="driver-permit"
                                >
                                    Разрешително
                                    ${escapeHtml(
                                        driver.currentTrailerPermit
                                    )}
                                </small>
                            `
                            : ""
                    }
                </div>

            </div>


            <footer
                class="driver-card-footer"
            >

                <span
                    class="
                        driver-status
                        driver-status-active
                    "
                >
                    ● Активен
                </span>


                ${
                    temporary

                        ? `
                            <span
                                class="
                                    driver-temporary
                                "
                            >
                                🔵 Временен курс
                            </span>
                        `

                        : `
                            <span>
                                ${
                                    driver.homeTruckRegistration
                                        ? "🏠 Постоянно зачисляване"
                                        : "Без постоянно зачисляване"
                                }
                            </span>
                        `
                }

            </footer>

        </article>
    `;
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refreshDrivers():
    Promise<void> {

    const currentVersion =
        ++refreshVersion;


    setPageMessage("");


    try {

        const result =
            await loadAdminDrivers();


        if (
            currentVersion !==
            refreshVersion
        ) {
            return;
        }


        const root =
            getRoot();


        if (
            !root?.isConnected
        ) {
            return;
        }


        drivers =
            result;


        renderDrivers();

    } catch (error) {

        if (
            currentVersion !==
            refreshVersion
        ) {
            return;
        }


        setPageMessage(
            errorMessage(error)
        );


        const list =
            document.querySelector<
                HTMLElement
            >(
                "#k3DriversList"
            );


        if (list) {
            list.innerHTML = `
                <div
                    class="
                        drivers-empty
                        drivers-empty-error
                    "
                >
                    Шофьорите не можаха
                    да бъдат заредени.
                </div>
            `;
        }
    }
}


/* =========================================================
   CREATE DRIVER
   ========================================================= */


async function handleSubmit(
    event: SubmitEvent
): Promise<void> {

    const form =
        event.target;


    if (
        !(form instanceof
            HTMLFormElement) ||
        form.id !==
            "k3AddDriverForm"
    ) {
        return;
    }


    event.preventDefault();


    const nameInput =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverName"
        );


    const phoneInput =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverPhone"
        );


    const loginInput =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverLoginId"
        );


    const passwordInput =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3DriverPassword"
        );


    const submitButton =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3DriverSubmitButton"
        );


    if (
        !nameInput ||
        !phoneInput ||
        !loginInput ||
        !passwordInput ||
        !submitButton
    ) {
        return;
    }


    const displayName =
        nameInput.value.trim();


    const phone =
        phoneInput.value.trim();


    const loginId =
        loginInput.value
            .trim()
            .toLowerCase();


    const password =
        passwordInput.value;


    if (!displayName) {
        setFormMessage(
            "Въведете име на шофьора.",
            "error"
        );

        nameInput.focus();

        return;
    }


    if (!phone) {
        setFormMessage(
            "Въведете телефон.",
            "error"
        );

        phoneInput.focus();

        return;
    }


    if (
        !/^[a-z0-9][a-z0-9._-]{2,31}$/
            .test(loginId)
    ) {
        setFormMessage(
            "Невалидно потребителско ID.",
            "error"
        );

        loginInput.focus();

        return;
    }


    if (
        password.length < 8
    ) {
        setFormMessage(
            "Паролата трябва да бъде поне 8 символа.",
            "error"
        );

        passwordInput.focus();

        return;
    }


    submitButton.disabled =
        true;


    submitButton.textContent =
        "Създаване...";


    setFormMessage(
        "",
        null
    );


    try {

        await createDriverAccount(
            {
                displayName,
                phone,
                loginId,
                password
            }
        );


        form.reset();


        passwordInput.type =
            "password";


        setFormMessage(
            "Шофьорът е създаден успешно.",
            "success"
        );


        await refreshDrivers();

    } catch (error) {

        setFormMessage(
            errorMessage(error),
            "error"
        );

    } finally {

        submitButton.disabled =
            false;


        submitButton.textContent =
            "➕ Добави шофьор";
    }
}


/* =========================================================
   CLICK
   ========================================================= */


function handleClick(
    event: MouseEvent
): void {

    const target =
        event.target;


    if (
        !(target instanceof Element)
    ) {
        return;
    }


    const button =
        target.closest<
            HTMLButtonElement
        >(
            "[data-driver-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset.driverAction;


    if (
        action !==
        "toggle-password"
    ) {
        return;
    }


    const passwordInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3DriverPassword"
        );


    if (!passwordInput) {
        return;
    }


    const shouldShow =
        passwordInput.type ===
        "password";


    passwordInput.type =
        shouldShow
            ? "text"
            : "password";


    button.textContent =
        shouldShow
            ? "🙈"
            : "👁";


    button.setAttribute(
        "aria-label",
        shouldShow
            ? "Скрий паролата"
            : "Покажи паролата"
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function initializeSection():
    Promise<void> {

    const root =
        getRoot();


    if (!root) {
        return;
    }


    root.addEventListener(
        "submit",
        event => {
            void handleSubmit(event);
        }
    );


    root.addEventListener(
        "click",
        handleClick
    );


    await refreshDrivers();
}
