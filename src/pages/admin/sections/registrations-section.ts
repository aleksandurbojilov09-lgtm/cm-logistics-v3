import "./registrations-section.css";

import {
    loadPendingClientRegistrations,
    reviewClientRegistration,
    type PendingClientRegistration
} from "../../../features/clients/client-registration-service";

import {
    loadPasswordResetRequests,
    rejectPasswordResetRequest,
    resetRequestedPassword,
    type PendingPasswordResetRequest
} from "../../../features/auth/admin-password-reset-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


let registrations:
    PendingClientRegistration[] =
    [];


let passwordResetRequests:
    PendingPasswordResetRequest[] =
    [];


let refreshVersion =
    0;


let passwordResetRefreshVersion =
    0;


export function renderSection(): string {
    return `
        <section
            id="k3RegistrationsSection"
            class="registrations-section"
        >
            <div
                id="k3RegistrationsMessage"
                class="registrations-message"
                aria-live="polite"
            ></div>

            <section class="registrations-panel">
                <header class="registrations-header">
                    <div>
                        <h3>🏢 Чакащи регистрации</h3>

                        <p>
                            Администратор или диспечер може да одобрява и отказва клиентски регистрации.
                        </p>
                    </div>

                    <span
                        id="k3RegistrationsCount"
                        class="registrations-count"
                    >
                        0
                    </span>
                </header>

                <div
                    id="k3RegistrationsList"
                    class="registrations-list"
                >
                    <div class="registrations-state">
                        Зареждане...
                    </div>
                </div>
            </section>

            <div
                id="k3PasswordResetMessage"
                class="registrations-message"
                aria-live="polite"
            ></div>

            <section class="registrations-panel">
                <header class="registrations-header">
                    <div>
                        <h3>🔐 Заявки за забравена парола</h3>

                        <p>
                            Първо потвърдете самоличността по записания телефон, след което откажете заявката или задайте нова парола.
                        </p>
                    </div>

                    <span
                        id="k3PasswordResetCount"
                        class="registrations-count"
                    >
                        0
                    </span>
                </header>

                <div
                    id="k3PasswordResetList"
                    class="registrations-list"
                >
                    <div class="registrations-state">
                        Зареждане...
                    </div>
                </div>
            </section>

            <div
                id="k3PasswordResetDialog"
                class="password-admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="k3PasswordResetDialogTitle"
                aria-describedby="k3PasswordResetDialogDescription"
                hidden
            >
                <button
                    class="password-admin-backdrop"
                    type="button"
                    data-password-reset-close
                    aria-label="Затвори прозореца"
                ></button>

                <section class="password-admin-dialog">
                    <header class="password-admin-dialog-header">
                        <div>
                            <h3 id="k3PasswordResetDialogTitle">
                                Обработка на заявка
                            </h3>

                            <p id="k3PasswordResetDialogDescription">
                                Проверете самоличността по телефона преди промяна.
                            </p>
                        </div>

                        <button
                            class="password-admin-close"
                            type="button"
                            data-password-reset-close
                            aria-label="Затвори"
                        >
                            ×
                        </button>
                    </header>

                    <div
                        id="k3PasswordResetDialogSummary"
                        class="password-admin-summary"
                    ></div>

                    <form
                        id="k3PasswordResetForm"
                        class="password-admin-form"
                        autocomplete="off"
                    >
                        <div
                            id="k3PasswordResetPasswordFields"
                            class="password-admin-password-fields"
                        >
                            <label>
                                Нова парола

                                <input
                                    id="k3PasswordResetNewPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    minlength="8"
                                    maxlength="128"
                                    required
                                />
                            </label>

                            <label>
                                Потвърди паролата

                                <input
                                    id="k3PasswordResetConfirmPassword"
                                    type="password"
                                    autocomplete="new-password"
                                    minlength="8"
                                    maxlength="128"
                                    required
                                />
                            </label>
                        </div>

                        <div
                            id="k3PasswordResetDialogMessage"
                            class="registrations-message"
                            aria-live="polite"
                        ></div>

                        <div class="password-admin-dialog-actions">
                            <button
                                type="button"
                                class="password-admin-cancel"
                                data-password-reset-close
                            >
                                Отказ
                            </button>

                            <button
                                id="k3PasswordResetConfirmButton"
                                type="submit"
                                class="password-admin-confirm"
                            >
                                Потвърди
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </section>
    `;
}


function getRoot():
HTMLElement | null {
    return document.querySelector(
        "#k3RegistrationsSection"
    );
}


function setMessage(
    message: string,
    status: "success" | "error" | null
): void {
    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3RegistrationsMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    if (status) {
        element.dataset.status =
            status;
    } else {
        delete element.dataset.status;
    }
}


function setPasswordResetMessage(
    message: string,
    status: "success" | "error" | null
): void {
    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    if (status) {
        element.dataset.status =
            status;
    } else {
        delete element.dataset.status;
    }
}


function setPasswordResetDialogMessage(
    message: string,
    status: "success" | "error" | null
): void {
    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialogMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    if (status) {
        element.dataset.status =
            status;
    } else {
        delete element.dataset.status;
    }
}


function errorMessage(
    error: unknown
): string {
    return (
        error instanceof Error &&
        error.message
    )
        ? error.message
        : "Възникна неочаквана грешка.";
}


function formatDate(
    value: string
): string {
    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "bg-BG",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(date);
}


function formatCoordinate(
    value: number
): string {
    return Number.isFinite(value)
        ? value.toFixed(6)
        : "—";
}


function displayValue(
    value: string | null
): string {
    return value?.trim() ||
        "—";
}


function renderPasswordResetRequests():
void {
    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetList"
        );

    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            passwordResetRequests.length
        );


    if (
        passwordResetRequests.length ===
            0
    ) {
        list.innerHTML = `
            <div class="registrations-state">
                Няма чакащи заявки за забравена парола.
            </div>
        `;

        return;
    }


    list.innerHTML =
        passwordResetRequests
            .map(
                request => {
                    const isClient =
                        request.role ===
                            "client";

                    const title =
                        isClient
                            ? displayValue(
                                request.companyName
                            )
                            : displayValue(
                                request.displayName
                            );

                    const phone =
                        isClient
                            ? displayValue(
                                request.companyPhone ||
                                request.profilePhone
                            )
                            : displayValue(
                                request.profilePhone
                            );

                    const roleLabel =
                        isClient
                            ? "Клиент"
                            : "Шофьор";

                    const statusLabel =
                        request.status ===
                            "processing"
                            ? "Поета за обработка"
                            : "Нова заявка";


                    return `
                        <article
                            class="registration-card password-reset-card"
                            data-password-reset-card="${escapeHtml(
                                request.id
                            )}"
                        >
                            <header class="registration-card-header">
                                <div>
                                    <h4>
                                        ${escapeHtml(
                                            title
                                        )}
                                    </h4>

                                    <span>
                                        Подадена:
                                        ${escapeHtml(
                                            formatDate(
                                                request.requestedAt
                                            )
                                        )}
                                    </span>
                                </div>

                                <div class="password-reset-badges">
                                    <strong>
                                        ${escapeHtml(
                                            roleLabel
                                        )}
                                    </strong>

                                    <span data-status="${escapeHtml(
                                        request.status
                                    )}">
                                        ${escapeHtml(
                                            statusLabel
                                        )}
                                    </span>
                                </div>
                            </header>

                            <div class="registration-details">
                                <div>
                                    <span>
                                        ${isClient
                                            ? "Фирма"
                                            : "Име на шофьора"}
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            title
                                        )}
                                    </strong>
                                </div>

                                ${isClient
                                    ? `
                                        <div>
                                            <span>Лице за контакт</span>

                                            <strong>
                                                ${escapeHtml(
                                                    displayValue(
                                                        request.contactPerson
                                                    )
                                                )}
                                            </strong>
                                        </div>
                                    `
                                    : ""}

                                <div>
                                    <span>Телефон за потвърждение</span>

                                    <strong>
                                        ${escapeHtml(
                                            phone
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>Login ID</span>

                                    <strong>
                                        ${escapeHtml(
                                            request.loginId
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>Дата и час на заявката</span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                request.requestedAt
                                            )
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div class="registration-actions">
                                <button
                                    type="button"
                                    class="registration-action password-reset-change"
                                    data-password-reset-action="reset"
                                    data-password-reset-id="${escapeHtml(
                                        request.id
                                    )}"
                                >
                                    🔑 Смени парола
                                </button>

                                <button
                                    type="button"
                                    class="registration-action registration-reject"
                                    data-password-reset-action="reject"
                                    data-password-reset-id="${escapeHtml(
                                        request.id
                                    )}"
                                >
                                    ❌ Откажи
                                </button>
                            </div>
                        </article>
                    `;
                }
            )
            .join("");
}


function renderRegistrations():
void {
    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3RegistrationsList"
        );

    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3RegistrationsCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            registrations.length
        );


    if (
        registrations.length === 0
    ) {
        list.innerHTML = `
            <div class="registrations-state">
                Няма чакащи клиентски регистрации.
            </div>
        `;

        return;
    }


    list.innerHTML =
        registrations
            .map(
                registration => `
                    <article
                        class="registration-card"
                        data-registration-card="${escapeHtml(
                            registration.id
                        )}"
                    >
                        <header class="registration-card-header">
                            <div>
                                <h4>
                                    ${escapeHtml(
                                        registration.companyName
                                    )}
                                </h4>

                                <span>
                                    Подадена:
                                    ${escapeHtml(
                                        formatDate(
                                            registration.createdAt
                                        )
                                    )}
                                </span>
                            </div>

                            <strong>
                                ID:
                                ${escapeHtml(
                                    registration.loginId
                                )}
                            </strong>
                        </header>

                        <div class="registration-details">
                            <div>
                                <span>Лице за контакт</span>
                                <strong>
                                    ${escapeHtml(
                                        registration.contactPerson
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Телефон</span>
                                <strong>
                                    ${escapeHtml(
                                        registration.phone
                                    )}
                                </strong>
                            </div>

                            <div class="registration-detail-wide">
                                <span>Адрес за товарене</span>
                                <strong>
                                    ${escapeHtml(
                                        registration.loadingAddress
                                    )}
                                </strong>
                            </div>

                            <label
                                class="
                                    registration-ramp-option
                                    registration-detail-wide
                                "
                            >
                                <input
                                    type="checkbox"
                                    data-registration-loading-ramp="${escapeHtml(
                                        registration.id
                                    )}"
                                    ${
                                        registration.loadingRamp
                                            ? "checked"
                                            : ""
                                    }
                                />

                                <span
                                    class="registration-ramp-check"
                                >
                                    ✓
                                </span>

                                <span
                                    class="registration-ramp-copy"
                                >
                                    <strong>
                                        Товарене рампа
                                    </strong>

                                    <small>
                                        Този обект задължително
                                        ще бъде първият адрес
                                        на камиона.
                                    </small>
                                </span>
                            </label>

                            <div>
                                <span>Latitude</span>
                                <strong>
                                    ${escapeHtml(
                                        formatCoordinate(
                                            registration.latitude
                                        )
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Longitude</span>
                                <strong>
                                    ${escapeHtml(
                                        formatCoordinate(
                                            registration.longitude
                                        )
                                    )}
                                </strong>
                            </div>
                        </div>

                        <label class="registration-note">
                            Бележка към решението (по желание)

                            <textarea
                                rows="3"
                                maxlength="1000"
                                data-registration-note="${escapeHtml(
                                    registration.id
                                )}"
                            ></textarea>
                        </label>

                        <div class="registration-actions">
                            <button
                                type="button"
                                class="registration-action registration-approve"
                                data-registration-action="approve"
                                data-registration-id="${escapeHtml(
                                    registration.id
                                )}"
                            >
                                ✅ Одобри
                            </button>

                            <button
                                type="button"
                                class="registration-action registration-reject"
                                data-registration-action="reject"
                                data-registration-id="${escapeHtml(
                                    registration.id
                                )}"
                            >
                                ❌ Откажи
                            </button>
                        </div>
                    </article>
                `
            )
            .join("");
}


async function refreshRegistrations():
Promise<void> {
    const currentVersion =
        ++refreshVersion;

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3RegistrationsList"
        );


    if (list) {
        list.innerHTML = `
            <div class="registrations-state">
                Зареждане...
            </div>
        `;
    }


    try {
        const nextRegistrations =
            await loadPendingClientRegistrations();


        if (
            currentVersion !==
                refreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        registrations =
            nextRegistrations;

        renderRegistrations();
    } catch (error) {
        if (
            currentVersion !==
                refreshVersion
        ) {
            return;
        }


        if (list) {
            list.innerHTML = `
                <div class="registrations-state registrations-state-error">
                    Регистрациите не можаха да бъдат заредени.
                </div>
            `;
        }


        setMessage(
            errorMessage(error),
            "error"
        );
    }
}


async function refreshPasswordResetRequests():
Promise<void> {
    const currentVersion =
        ++passwordResetRefreshVersion;

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetList"
        );


    if (list) {
        list.innerHTML = `
            <div class="registrations-state">
                Зареждане...
            </div>
        `;
    }


    try {
        const nextRequests =
            await loadPasswordResetRequests();


        if (
            currentVersion !==
                passwordResetRefreshVersion ||
            !getRoot()?.isConnected
        ) {
            return;
        }


        passwordResetRequests =
            nextRequests;

        renderPasswordResetRequests();
    } catch (error) {
        if (
            currentVersion !==
                passwordResetRefreshVersion
        ) {
            return;
        }


        if (list) {
            list.innerHTML = `
                <div class="registrations-state registrations-state-error">
                    Заявките за парола не можаха да бъдат заредени.
                </div>
            `;
        }


        setPasswordResetMessage(
            errorMessage(error),
            "error"
        );
    }
}


async function handleReview(
    button: HTMLButtonElement
): Promise<void> {
    const requestId =
        button.dataset.registrationId ||
        "";

    const action =
        button.dataset.registrationAction;


    if (
        !requestId ||
        (
            action !== "approve" &&
            action !== "reject"
        )
    ) {
        return;
    }


    const decision =
        action;

    const confirmed =
        window.confirm(
            decision === "approve"
                ? "Да бъде ли одобрена тази клиентска регистрация?"
                : "Да бъде ли отказана тази клиентска регистрация?"
        );


    if (!confirmed) {
        return;
    }


    const note =
        document.querySelector<
            HTMLTextAreaElement
        >(
            `[data-registration-note="${requestId}"]`
        )
        ?.value.trim() ||
        "";


    const loadingRamp =
        document.querySelector<
            HTMLInputElement
        >(
            `[data-registration-loading-ramp="${requestId}"]`
        )
        ?.checked ===
        true;


    const card =
        button.closest<HTMLElement>(
            "[data-registration-card]"
        );

    const buttons =
        card?.querySelectorAll<
            HTMLButtonElement
        >(
            "[data-registration-action]"
        );


    buttons?.forEach(
        element => {
            element.disabled =
                true;
        }
    );

    setMessage(
        "",
        null
    );


    try {
        const message =
            await reviewClientRegistration({
                requestId,
                decision,
                note,
                loadingRamp
            });


        await refreshRegistrations();

        setMessage(
            message,
            "success"
        );
    } catch (error) {
        setMessage(
            errorMessage(error),
            "error"
        );


        buttons?.forEach(
            element => {
                element.disabled =
                    false;
            }
        );
    }
}


function closePasswordResetDialog():
void {
    const dialog =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialog"
        );


    if (!dialog) {
        return;
    }


    dialog.hidden =
        true;

    document.body.classList.remove(
        "password-admin-modal-open"
    );

    delete dialog.dataset.requestId;
    delete dialog.dataset.action;
}


function openPasswordResetDialog(
    button: HTMLButtonElement
): void {
    const requestId =
        button.dataset.passwordResetId ||
        "";

    const action =
        button.dataset.passwordResetAction;

    const request =
        passwordResetRequests.find(
            item =>
                item.id ===
                    requestId
        );


    if (
        !request ||
        (
            action !== "reset" &&
            action !== "reject"
        )
    ) {
        return;
    }


    const dialog =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialog"
        );

    const title =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialogTitle"
        );

    const description =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialogDescription"
        );

    const summary =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialogSummary"
        );

    const form =
        document.querySelector<
            HTMLFormElement
        >(
            "#k3PasswordResetForm"
        );

    const passwordFields =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetPasswordFields"
        );

    const newPassword =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3PasswordResetNewPassword"
        );

    const confirmPassword =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3PasswordResetConfirmPassword"
        );

    const confirmButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#k3PasswordResetConfirmButton"
        );


    if (
        !dialog ||
        !title ||
        !description ||
        !summary ||
        !form ||
        !passwordFields ||
        !newPassword ||
        !confirmPassword ||
        !confirmButton
    ) {
        return;
    }


    const isClient =
        request.role ===
            "client";

    const targetName =
        isClient
            ? displayValue(
                request.companyName
            )
            : displayValue(
                request.displayName
            );

    const phone =
        isClient
            ? displayValue(
                request.companyPhone ||
                request.profilePhone
            )
            : displayValue(
                request.profilePhone
            );


    dialog
        .querySelectorAll<
            HTMLButtonElement
        >(
            "button"
        )
        .forEach(
            button => {
                button.disabled =
                    false;
            }
        );

    form.reset();

    setPasswordResetDialogMessage(
        "",
        null
    );

    dialog.dataset.requestId =
        request.id;

    dialog.dataset.action =
        action;

    passwordFields.hidden =
        action !== "reset";

    newPassword.required =
        action === "reset";

    confirmPassword.required =
        action === "reset";

    confirmButton.classList.toggle(
        "password-admin-confirm-danger",
        action === "reject"
    );

    title.textContent =
        action === "reset"
            ? "Смени парола"
            : "Откажи заявката";

    description.textContent =
        action === "reset"
            ? "Въведете новата парола два пъти. Смяната ще се извърши само ако заявката още е свободна за обработка."
            : "Тази заявка ще бъде затворена без промяна на паролата.";

    summary.innerHTML = `
        <div>
            <span>${isClient
                ? "Фирма"
                : "Шофьор"}</span>
            <strong>${escapeHtml(
                targetName
            )}</strong>
        </div>

        <div>
            <span>Телефон</span>
            <strong>${escapeHtml(
                phone
            )}</strong>
        </div>

        <div>
            <span>Login ID</span>
            <strong>${escapeHtml(
                request.loginId
            )}</strong>
        </div>
    `;

    confirmButton.textContent =
        action === "reset"
            ? "Смени паролата"
            : "Откажи заявката";

    dialog.hidden =
        false;

    document.body.classList.add(
        "password-admin-modal-open"
    );

    window.setTimeout(
        () => {
            if (action === "reset") {
                newPassword.focus();
            } else {
                confirmButton.focus();
            }
        },
        0
    );
}


async function handlePasswordResetSubmit(
    event: SubmitEvent
): Promise<void> {
    event.preventDefault();

    const dialog =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialog"
        );

    const newPassword =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3PasswordResetNewPassword"
        );

    const confirmPassword =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3PasswordResetConfirmPassword"
        );

    const confirmButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#k3PasswordResetConfirmButton"
        );


    if (
        !dialog ||
        !newPassword ||
        !confirmPassword ||
        !confirmButton
    ) {
        return;
    }


    const requestId =
        dialog.dataset.requestId ||
        "";

    const action =
        dialog.dataset.action;


    if (
        !requestId ||
        (
            action !== "reset" &&
            action !== "reject"
        )
    ) {
        return;
    }


    if (action === "reset") {
        if (
            newPassword.value.length < 8 ||
            newPassword.value.length > 128
        ) {
            setPasswordResetDialogMessage(
                "Паролата трябва да бъде между 8 и 128 символа.",
                "error"
            );

            return;
        }


        if (
            newPassword.value !==
                confirmPassword.value
        ) {
            setPasswordResetDialogMessage(
                "Двете пароли не съвпадат.",
                "error"
            );

            return;
        }
    }


    const dialogButtons =
        dialog.querySelectorAll<
            HTMLButtonElement
        >(
            "button"
        );


    dialogButtons.forEach(
        button => {
            button.disabled =
                true;
        }
    );

    setPasswordResetDialogMessage(
        "",
        null
    );

    confirmButton.textContent =
        "Обработване...";


    try {
        const message =
            action === "reset"
                ? await resetRequestedPassword(
                    requestId,
                    newPassword.value
                )
                : await rejectPasswordResetRequest(
                    requestId
                );

        closePasswordResetDialog();

        await refreshPasswordResetRequests();

        setPasswordResetMessage(
            message,
            "success"
        );
    } catch (error) {
        setPasswordResetDialogMessage(
            errorMessage(error),
            "error"
        );


        dialogButtons.forEach(
            button => {
                button.disabled =
                    false;
            }
        );

        confirmButton.textContent =
            action === "reset"
                ? "Смени паролата"
                : "Откажи заявката";
    }
}


export async function initializeSection():
Promise<void> {
    const root =
        getRoot();


    if (!root) {
        return;
    }


    root.addEventListener(
        "click",
        event => {
            const target =
                event.target;


            if (
                !(target instanceof Element)
            ) {
                return;
            }


            const closeButton =
                target.closest<
                    HTMLButtonElement
                >(
                    "[data-password-reset-close]"
                );


            if (closeButton) {
                closePasswordResetDialog();

                return;
            }


            const passwordResetButton =
                target.closest<
                    HTMLButtonElement
                >(
                    "[data-password-reset-action]"
                );


            if (passwordResetButton) {
                openPasswordResetDialog(
                    passwordResetButton
                );

                return;
            }


            const button =
                target.closest<
                    HTMLButtonElement
                >(
                    "[data-registration-action]"
                );


            if (button) {
                void handleReview(
                    button
                );
            }
        }
    );


    const passwordResetForm =
        document.querySelector<
            HTMLFormElement
        >(
            "#k3PasswordResetForm"
        );

    const passwordResetDialog =
        document.querySelector<
            HTMLElement
        >(
            "#k3PasswordResetDialog"
        );


    passwordResetForm?.addEventListener(
        "submit",
        event => {
            void handlePasswordResetSubmit(
                event
            );
        }
    );

    passwordResetDialog?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                event.preventDefault();
                closePasswordResetDialog();
            }
        }
    );


    await Promise.all([
        refreshRegistrations(),
        refreshPasswordResetRequests()
    ]);
}
