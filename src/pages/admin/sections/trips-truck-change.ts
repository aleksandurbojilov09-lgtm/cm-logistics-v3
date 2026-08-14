import {
    cancelAdminTruckChange,
    loadAdminPendingTruckChanges,
    loadAdminTruckChangeOptions,
    requestAdminTruckChange,
    type AdminActiveTrip,
    type AdminPendingTruckChange,
    type AdminTruckChangeMode,
    type AdminTruckChangeOption
} from "../../../features/trips/admin-trip-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


type MessageType =
    | "success"
    | "error"
    | null;


export type AdminTruckChangeUiHost = {
    findTrip:
        (tripId: string) =>
            AdminActiveTrip | null;

    getDialog:
        () =>
            HTMLDialogElement | null;

    refresh:
        () => Promise<void>;

    setMessage:
        (
            message: string,
            type: MessageType
        ) => void;

    errorMessage:
        (error: unknown) => string;
};


let options:
    AdminTruckChangeOption[] =
    [];


let pendingByTrip =
    new Map<
        string,
        AdminPendingTruckChange
    >();


function modeLabel(
    mode: AdminTruckChangeMode
): string {

    return mode ===
        "permanent"
        ? "Постоянна промяна"
        : "Само за този курс";
}


function formatDate(
    value: string | null
): string {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? "-"
        : date.toLocaleString(
            "bg-BG"
        );
}


export async function
refreshTruckChangeState(
    trips: AdminActiveTrip[]
): Promise<void> {

    const activeTripIds =
        new Set(
            trips.map(
                trip =>
                    trip.id
            )
        );


    const pendingChanges =
        await loadAdminPendingTruckChanges();


    pendingByTrip =
        new Map(
            pendingChanges
                .filter(
                    pending =>
                        activeTripIds.has(
                            pending.tripId
                        )
                )
                .map(
                    pending => [
                        pending.tripId,
                        pending
                    ]
                )
        );
}


export function
resetTruckChangeDialogState():
void {

    options =
        [];
}


export function
renderTruckChangeStatus(
    trip: AdminActiveTrip
): string {

    const pending =
        pendingByTrip.get(
            trip.id
        );


    if (!pending) {
        return "";
    }


    return `
        <section
            class="trip-truck-change-pending"
        >

            <div>

                <span
                    class="trip-truck-change-kicker"
                >
                    ⏳ Смяна на камион
                </span>


                <strong
                    class="trip-truck-change-route"
                >
                    ${escapeHtml(
                        pending.fromTruckNumber ||
                        "-"
                    )}
                    →
                    ${escapeHtml(
                        pending.toTruckNumber ||
                        "-"
                    )}
                </strong>


                <p>
                    ${escapeHtml(
                        modeLabel(
                            pending.changeMode
                        )
                    )}
                    • Чака шофьора да въведе километражите.
                </p>


                <small>
                    Изпратена:
                    ${escapeHtml(
                        formatDate(
                            pending.requestedAt
                        )
                    )}
                </small>

            </div>


            <button
                type="button"
                class="trip-truck-change-cancel"
                data-trips-action="cancel-truck-change"
                data-trip-id="${escapeHtml(
                    trip.id
                )}"
            >
                ✕ Отмени заявката
            </button>

        </section>
    `;
}


export function
renderTruckChangeButton(
    trip: AdminActiveTrip
): string {

    const pending =
        pendingByTrip.has(
            trip.id
        );


    return `
        <button
            type="button"
            class="trip-change-truck-button"
            data-trips-action="change-truck"
            data-trip-id="${escapeHtml(
                trip.id
            )}"
            ${
                trip.activeSegment &&
                !pending
                    ? ""
                    : "disabled"
            }
        >
            ${
                pending
                    ? "⏳ Смяната чака"
                    : "🔄 Смени камиона"
            }
        </button>
    `;
}


function optionText(
    option: AdminTruckChangeOption
): string {

    const details =
        [
            option.currentDriverName
                ? `Текущ: ${option.currentDriverName}`
                : null,

            option.homeDriverName
                ? `Home: ${option.homeDriverName}`
                : null
        ]
        .filter(Boolean)
        .join(" • ");


    return details
        ? `${option.registrationNumber} — ${details}`
        : option.registrationNumber;
}


async function openDialog(
    tripId: string,
    host: AdminTruckChangeUiHost
): Promise<void> {

    const trip =
        host.findTrip(
            tripId
        );


    const dialog =
        host.getDialog();


    if (
        !trip ||
        !dialog ||
        !trip.activeSegment
    ) {
        return;
    }


    if (
        pendingByTrip.has(
            tripId
        )
    ) {

        host.setMessage(
            "За този курс вече има активна заявка за смяна на камион.",
            "error"
        );

        return;
    }


    dialog.dataset.tripId =
        tripId;


    dialog.innerHTML = `
        <div
            class="trip-action-loading"
        >
            Зареждане на свободните камиони...
        </div>
    `;


    if (!dialog.open) {
        dialog.showModal();
    }


    try {

        options =
            await loadAdminTruckChangeOptions(
                tripId
            );


        if (
            !dialog.open ||
            dialog.dataset.tripId !==
                tripId
        ) {
            return;
        }


        if (
            options.length ===
            0
        ) {

            dialog.innerHTML = `
                <div
                    class="trip-action-form"
                >

                    <header
                        class="trip-action-dialog-header"
                    >

                        <div>
                            <h3>
                                🔄 Смени камиона
                            </h3>

                            <p>
                                Курс
                                #${escapeHtml(
                                    trip.tripNumber
                                )}
                            </p>
                        </div>


                        <button
                            type="button"
                            class="trip-dialog-close"
                            data-trips-action="close-dialog"
                        >
                            ✕
                        </button>

                    </header>


                    <div
                        class="trip-action-empty"
                    >
                        Няма свободен камион,
                        който може да бъде използван
                        за този курс.
                    </div>

                </div>
            `;

            return;
        }


        dialog.innerHTML = `
            <form
                id="k3TruckChangeForm"
                class="trip-action-form"
                data-trip-id="${escapeHtml(
                    tripId
                )}"
            >

                <header
                    class="trip-action-dialog-header"
                >

                    <div>
                        <h3>
                            🔄 Смени камиона
                        </h3>

                        <p>
                            Курс
                            #${escapeHtml(
                                trip.tripNumber
                            )}
                        </p>
                    </div>


                    <button
                        type="button"
                        class="trip-dialog-close"
                        data-trips-action="close-dialog"
                        aria-label="Затвори"
                    >
                        ✕
                    </button>

                </header>


                <div
                    class="trip-action-info"
                >
                    <span>
                        Текущ камион
                    </span>

                    <strong>
                        ${escapeHtml(
                            trip.activeSegment
                                .truckNumber ||
                            "-"
                        )}
                    </strong>
                </div>


                <label>
                    Нов камион

                    <select
                        id="k3TruckChangeTruckSelect"
                        required
                    >

                        <option value="">
                            -- Избери камион --
                        </option>

                        ${
                            options
                                .map(
                                    option => `
                                        <option
                                            value="${escapeHtml(
                                                option.id
                                            )}"
                                        >
                                            ${escapeHtml(
                                                optionText(
                                                    option
                                                )
                                            )}
                                        </option>
                                    `
                                )
                                .join("")
                        }

                    </select>
                </label>


                <div
                    id="k3TruckChangeDetails"
                    class="trip-truck-change-details"
                >
                    Изберете нов камион.
                </div>


                <label>
                    Режим на смяната

                    <select
                        id="k3TruckChangeMode"
                        required
                        disabled
                    ></select>
                </label>


                <div
                    id="k3TruckChangeWarning"
                    class="trip-action-warning"
                >
                    Изберете камион и режим.
                </div>


                <button
                    id="k3TruckChangeSubmit"
                    type="submit"
                    class="trip-action-primary"
                    disabled
                >
                    🔄 Изпрати заявката
                </button>

            </form>
        `;


    } catch (error) {

        dialog.innerHTML = `
            <div
                class="trip-action-form"
            >

                <header
                    class="trip-action-dialog-header"
                >
                    <h3>
                        🔄 Смени камиона
                    </h3>

                    <button
                        type="button"
                        class="trip-dialog-close"
                        data-trips-action="close-dialog"
                    >
                        ✕
                    </button>
                </header>


                <div
                    class="trip-action-error"
                >
                    ${escapeHtml(
                        host.errorMessage(
                            error
                        )
                    )}
                </div>

            </div>
        `;
    }
}


function updateForm():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3TripActionDialog"
        );


    if (!dialog) {
        return;
    }


    const truckSelect =
        dialog.querySelector<
            HTMLSelectElement
        >(
            "#k3TruckChangeTruckSelect"
        );


    const modeSelect =
        dialog.querySelector<
            HTMLSelectElement
        >(
            "#k3TruckChangeMode"
        );


    const details =
        dialog.querySelector<
            HTMLElement
        >(
            "#k3TruckChangeDetails"
        );


    const warning =
        dialog.querySelector<
            HTMLElement
        >(
            "#k3TruckChangeWarning"
        );


    const submit =
        dialog.querySelector<
            HTMLButtonElement
        >(
            "#k3TruckChangeSubmit"
        );


    if (
        !truckSelect ||
        !modeSelect ||
        !details ||
        !warning ||
        !submit
    ) {
        return;
    }


    const option =
        options.find(
            item =>
                item.id ===
                    truckSelect.value
        );


    if (!option) {

        modeSelect.innerHTML =
            "";

        modeSelect.disabled =
            true;

        submit.disabled =
            true;

        details.textContent =
            "Изберете нов камион.";

        warning.textContent =
            "Изберете камион и режим.";

        return;
    }


    const modes:
        Array<{
            value: AdminTruckChangeMode;
            label: string;
        }> =
        [];


    if (option.canTemporary) {

        modes.push({
            value:
                "temporary_for_trip",

            label:
                "Само за този курс"
        });
    }


    if (option.canPermanent) {

        modes.push({
            value:
                "permanent",

            label:
                "Постоянна промяна"
        });
    }


    const previousMode =
        modeSelect.value;


    modeSelect.innerHTML =
        modes
            .map(
                mode => `
                    <option
                        value="${mode.value}"
                    >
                        ${escapeHtml(
                            mode.label
                        )}
                    </option>
                `
            )
            .join("");


    const selectedMode =
        modes.some(
            mode =>
                mode.value ===
                    previousMode
        )

            ? previousMode

            : modes[0]?.value ||
                "";


    modeSelect.value =
        selectedMode;


    modeSelect.disabled =
        modes.length ===
            0;


    submit.disabled =
        modes.length ===
            0;


    details.innerHTML = `
        <strong>
            ${escapeHtml(
                option.registrationNumber
            )}
        </strong>

        <span>
            Текущ шофьор:
            ${escapeHtml(
                option.currentDriverName ||
                "няма"
            )}
        </span>

        <span>
            Home шофьор:
            ${escapeHtml(
                option.homeDriverName ||
                "няма"
            )}
        </span>
    `;


    warning.textContent =
        selectedMode ===
            "permanent"

            ? "⚠️ Постоянна промяна: след приключване на курса новият камион остава Home камион на шофьора."

            : "ℹ️ Само за този курс: след приключване на курса първоначалната Home композиция се възстановява автоматично.";
}


async function submitForm(
    form: HTMLFormElement,
    host: AdminTruckChangeUiHost
): Promise<void> {

    const tripId =
        form.dataset.tripId;


    const truckSelect =
        form.querySelector<
            HTMLSelectElement
        >(
            "#k3TruckChangeTruckSelect"
        );


    const modeSelect =
        form.querySelector<
            HTMLSelectElement
        >(
            "#k3TruckChangeMode"
        );


    const submit =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3TruckChangeSubmit"
        );


    if (
        !tripId ||
        !truckSelect ||
        !modeSelect ||
        !submit
    ) {
        return;
    }


    if (!truckSelect.value) {

        host.setMessage(
            "Изберете нов камион.",
            "error"
        );

        return;
    }


    const mode =
        modeSelect.value;


    if (
        mode !==
            "temporary_for_trip" &&
        mode !==
            "permanent"
    ) {

        host.setMessage(
            "Изберете валиден режим на смяната.",
            "error"
        );

        return;
    }


    submit.disabled =
        true;


    submit.textContent =
        "Изпращане...";


    try {

        await requestAdminTruckChange(
            tripId,
            truckSelect.value,
            mode
        );


        const dialog =
            host.getDialog();


        if (dialog?.open) {
            dialog.close();
        }


        resetTruckChangeDialogState();


        await host.refresh();


        host.setMessage(
            "✅ Заявката за смяна на камион е изпратена. Чака потвърждение от шофьора.",
            "success"
        );


    } catch (error) {

        host.setMessage(
            host.errorMessage(
                error
            ),
            "error"
        );


        submit.disabled =
            false;


        submit.textContent =
            "🔄 Изпрати заявката";
    }
}


async function cancelPending(
    tripId: string,
    button: HTMLButtonElement,
    host: AdminTruckChangeUiHost
): Promise<void> {

    const pending =
        pendingByTrip.get(
            tripId
        );


    if (!pending) {

        await host.refresh();

        return;
    }


    const confirmed =
        window.confirm(
            `Да отменим ли заявката за смяна ${pending.fromTruckNumber || "-"} → ${pending.toTruckNumber || "-"}?`
        );


    if (!confirmed) {
        return;
    }


    button.disabled =
        true;


    button.textContent =
        "Отмяна...";


    try {

        await cancelAdminTruckChange(
            pending.id
        );


        await host.refresh();


        host.setMessage(
            "✅ Заявката за смяна на камион е отменена.",
            "success"
        );


    } catch (error) {

        host.setMessage(
            host.errorMessage(
                error
            ),
            "error"
        );


        button.disabled =
            false;


        button.textContent =
            "✕ Отмени заявката";
    }
}


export async function
handleTruckChangeClick(
    button: HTMLButtonElement,
    host: AdminTruckChangeUiHost
): Promise<boolean> {

    const action =
        button.dataset
            .tripsAction;


    if (
        action ===
        "change-truck"
    ) {

        const tripId =
            button.dataset.tripId;


        if (tripId) {

            await openDialog(
                tripId,
                host
            );
        }


        return true;
    }


    if (
        action ===
        "cancel-truck-change"
    ) {

        const tripId =
            button.dataset.tripId;


        if (tripId) {

            await cancelPending(
                tripId,
                button,
                host
            );
        }


        return true;
    }


    return false;
}


export async function
handleTruckChangeSubmit(
    form: HTMLFormElement,
    host: AdminTruckChangeUiHost
): Promise<boolean> {

    if (
        form.id !==
        "k3TruckChangeForm"
    ) {
        return false;
    }


    await submitForm(
        form,
        host
    );


    return true;
}


export function
handleTruckChangeFieldChange(
    target: EventTarget | null
): boolean {

    if (
        !(target instanceof
            HTMLSelectElement)
    ) {
        return false;
    }


    if (
        target.id !==
            "k3TruckChangeTruckSelect" &&
        target.id !==
            "k3TruckChangeMode"
    ) {
        return false;
    }


    updateForm();


    return true;
}
