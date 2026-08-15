import "./registrations-section.css";

import {
    loadPendingClientRegistrations,
    reviewClientRegistration,
    type PendingClientRegistration
} from "../../../features/clients/client-registration-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


let registrations:
    PendingClientRegistration[] =
    [];


let refreshVersion =
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
                            Само администратор може да одобрява или отказва клиентски регистрации.
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
                note
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


    await refreshRegistrations();
}
