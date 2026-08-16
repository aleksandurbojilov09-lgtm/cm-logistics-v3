import "./fleet-section.css";

import {
    createFleetTrailer,
    createFleetTruck,
    loadFleetSnapshot,
    releaseFleetTruck,
    savePermanentComposition,
    type FleetAssignment,
    type FleetDriver,
    type FleetSnapshot,
    type FleetTrailer,
    type FleetTruck
} from "../../../features/fleet/fleet-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


type TruckVisualState =
    | "free"
    | "incomplete"
    | "ready";


let fleetSnapshot:
    FleetSnapshot | null =
    null;


let refreshVersion =
    0;


/* =========================================================
   HELPERS
   ========================================================= */


function getRoot():
    HTMLElement | null {
    return document.querySelector(
        "#k3FleetSection"
    );
}


function getDialog():
    HTMLDialogElement | null {
    return document.querySelector(
        "#k3FleetDialog"
    );
}


function getDriverById(
    driverId: string | null
): FleetDriver | null {
    if (
        !fleetSnapshot ||
        !driverId
    ) {
        return null;
    }

    return (
        fleetSnapshot.drivers.find(
            driver =>
                driver.id === driverId
        ) ||
        null
    );
}


function getTrailerById(
    trailerId: string | null
): FleetTrailer | null {
    if (
        !fleetSnapshot ||
        !trailerId
    ) {
        return null;
    }

    return (
        fleetSnapshot.trailers.find(
            trailer =>
                trailer.id === trailerId
        ) ||
        null
    );
}


function getTruckById(
    truckId: string
): FleetTruck | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot.trucks.find(
            truck =>
                truck.id === truckId
        ) ||
        null
    );
}


function getActiveAssignmentByTruck(
    truckId: string
): FleetAssignment | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot
            .activeAssignments
            .find(
                assignment =>
                    assignment.truckId ===
                    truckId
            ) ||
        null
    );
}


function getActiveAssignmentByDriver(
    driverId: string
): FleetAssignment | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot
            .activeAssignments
            .find(
                assignment =>
                    assignment.driverId ===
                    driverId
            ) ||
        null
    );
}


function getActiveAssignmentByTrailer(
    trailerId: string
): FleetAssignment | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot
            .activeAssignments
            .find(
                assignment =>
                    assignment.trailerId ===
                    trailerId
            ) ||
        null
    );
}


function getHomeDriverIdByTruck(
    truckId: string
): string | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot.homeTrucks.find(
            home =>
                home.truckId ===
                truckId
        )?.driverId ||
        null
    );
}


function getHomeTruckIdByDriver(
    driverId: string
): string | null {
    if (!fleetSnapshot) {
        return null;
    }

    return (
        fleetSnapshot.homeTrucks.find(
            home =>
                home.driverId ===
                driverId
        )?.truckId ||
        null
    );
}


function isTruckLocked(
    truckId: string
): boolean {
    if (!fleetSnapshot) {
        return false;
    }

    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    if (
        assignment?.assignmentMode ===
        "temporary_for_trip"
    ) {
        return true;
    }

    return fleetSnapshot
        .lockedTruckIds
        .includes(truckId);
}


function isHomeDriverAway(
    truckId: string
): boolean {
    const homeDriverId =
        getHomeDriverIdByTruck(
            truckId
        );

    if (!homeDriverId) {
        return false;
    }

    const current =
        getActiveAssignmentByDriver(
            homeDriverId
        );

    return Boolean(
        current &&
        current.truckId !== truckId &&
        current.assignmentMode ===
            "temporary_for_trip"
    );
}


function getTruckState(
    truckId: string
): TruckVisualState {
    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    if (!assignment) {
        return "free";
    }

    if (
        assignment.driverId &&
        assignment.trailerId
    ) {
        return "ready";
    }

    return "incomplete";
}


function getTruckStateLabel(
    truckId: string
): string {
    const state =
        getTruckState(
            truckId
        );

    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    if (
        state === "ready" &&
        assignment?.assignmentMode ===
            "temporary_for_trip"
    ) {
        return (
            "🔵 Временна композиция по курс"
        );
    }

    if (state === "ready") {
        return "🟢 Готова композиция";
    }

    if (
        state === "incomplete" &&
        isHomeDriverAway(truckId)
    ) {
        return (
            "🟡 Шофьорът е временно на друг курс"
        );
    }

    if (state === "incomplete") {
        return "🟡 Непълна композиция";
    }

    return "⚪ Свободен камион";
}


function getDisplayedDriver(
    truckId: string
): FleetDriver | null {
    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    if (assignment?.driverId) {
        return getDriverById(
            assignment.driverId
        );
    }

    const homeDriverId =
        getHomeDriverIdByTruck(
            truckId
        );

    return getDriverById(
        homeDriverId
    );
}


function getOperationalLabel(
    truckId: string
): string {
    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    if (
        assignment?.assignmentMode ===
        "temporary_for_trip"
    ) {
        return "🔵 Временен курс";
    }

    if (
        isHomeDriverAway(
            truckId
        )
    ) {
        return (
            "🟡 Постоянният шофьор е временно на друг курс"
        );
    }

    if (isTruckLocked(truckId)) {
        return "🔵 В активен курс";
    }

    return "⏸️ Няма активен курс";
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

    return (
        "Възникна неочаквана грешка."
    );
}


/* =========================================================
   MAIN HTML
   ========================================================= */


export function renderSection():
    string {
    return `
        <section
            id="k3FleetSection"
            class="fleet-section"
        >

            <div
                id="k3FleetStatus"
                class="fleet-status"
                aria-live="polite"
            ></div>


            <section
                id="k3FleetToolbar"
                class="fleet-toolbar"
            >
                <div
                    class="fleet-loading"
                >
                    Зареждане на автопарка...
                </div>
            </section>


            <div
                id="k3FleetTruckList"
                class="fleet-truck-grid"
            ></div>


            <section
                class="fleet-trailers"
            >
                <header
                    class="fleet-section-heading"
                >
                    <div>
                        <h3>
                            🛻 Ремаркета в гаража
                        </h3>

                        <p>
                            Разрешителното е постоянно
                            към конкретното ремарке.
                        </p>
                    </div>
                </header>

                <div
                    id="k3FleetTrailerList"
                    class="fleet-trailer-grid"
                ></div>
            </section>


            <dialog
                id="k3FleetDialog"
                class="fleet-dialog"
            ></dialog>

        </section>
    `;
}


/* =========================================================
   TOOLBAR
   ========================================================= */


function renderToolbar(): void {
    if (!fleetSnapshot) {
        return;
    }

    const toolbar =
        document.querySelector<
            HTMLElement
        >(
            "#k3FleetToolbar"
        );

    if (!toolbar) {
        return;
    }

    const readyCount =
        fleetSnapshot.trucks.filter(
            truck =>
                getTruckState(
                    truck.id
                ) === "ready"
        ).length;

    toolbar.innerHTML = `
        <div
            class="fleet-toolbar-top"
        >
            <div>
                <h3>
                    🏢 Виртуален гараж
                </h3>

                <p>
                    Камион + ремарке + шофьор
                    = готова композиция
                </p>
            </div>


            <div
                class="fleet-toolbar-actions"
            >
                <button
                    type="button"
                    class="
                        fleet-button
                        fleet-button-primary
                    "
                    data-fleet-action="add-truck"
                >
                    ➕ Камион
                </button>

                <button
                    type="button"
                    class="
                        fleet-button
                        fleet-button-success
                    "
                    data-fleet-action="add-trailer"
                >
                    ➕ Ремарке
                </button>
            </div>
        </div>


        <div class="fleet-stats">

            <div class="fleet-stat">
                <span>
                    Камиони
                </span>

                <strong>
                    ${fleetSnapshot.trucks.length}
                </strong>
            </div>


            <div class="fleet-stat">
                <span>
                    Ремаркета
                </span>

                <strong>
                    ${fleetSnapshot.trailers.length}
                </strong>
            </div>


            <div
                class="
                    fleet-stat
                    fleet-stat-ready
                "
            >
                <span>
                    Готови композиции
                </span>

                <strong>
                    ${readyCount}
                </strong>
            </div>

        </div>
    `;
}


/* =========================================================
   TRUCKS
   ========================================================= */


function renderTruckCards(): void {
    if (!fleetSnapshot) {
        return;
    }

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3FleetTruckList"
        );

    if (!container) {
        return;
    }

    if (
        fleetSnapshot.trucks.length ===
        0
    ) {
        container.innerHTML = `
            <div class="fleet-empty">
                Все още няма добавени
                камиони.
            </div>
        `;

        return;
    }

    container.innerHTML =
        fleetSnapshot.trucks
            .map(renderTruckCard)
            .join("");
}


function renderTruckCard(
    truck: FleetTruck
): string {
    const assignment =
        getActiveAssignmentByTruck(
            truck.id
        );

    const driver =
        getDisplayedDriver(
            truck.id
        );

    const trailer =
        getTrailerById(
            assignment?.trailerId ||
            null
        );

    const state =
        getTruckState(
            truck.id
        );

    const locked =
        isTruckLocked(
            truck.id
        );

    let stateClass =
        "fleet-truck-free";

    if (state === "ready") {
        stateClass =
            "fleet-truck-ready";
    }

    if (
        state === "incomplete"
    ) {
        stateClass =
            "fleet-truck-incomplete";
    }

    let buttonLabel =
        "⚙️ Промени композицията";

    if (
        assignment?.assignmentMode ===
        "temporary_for_trip"
    ) {
        buttonLabel =
            "🔒 Временна композиция — заключена";
    } else if (locked) {
        buttonLabel =
            "🔒 Активен курс — композицията е заключена";
    }

    return `
        <article
            class="
                fleet-truck-card
                ${stateClass}
            "
        >

            <header
                class="fleet-truck-header"
            >
                <div
                    class="fleet-truck-number"
                >
                    🚛
                    ${escapeHtml(
                        truck.registrationNumber
                    )}
                </div>

                <div
                    class="
                        fleet-state-badge
                        ${stateClass}
                    "
                >
                    ${getTruckStateLabel(
                        truck.id
                    )}
                </div>
            </header>


            <div
                class="fleet-truck-body"
            >

                <div
                    class="fleet-info-grid"
                >

                    <div
                        class="fleet-info-card"
                    >
                        <span>
                            👤 Шофьор
                        </span>

                        <strong
                            class="${
                                driver
                                    ? ""
                                    : "fleet-warning-text"
                            }"
                        >
                            ${
                                driver
                                    ? escapeHtml(
                                        driver.name
                                    )
                                    : "Няма зачислен"
                            }
                        </strong>

                        ${
                            driver?.employeeCode

                                ? `
                                    <small>
                                        ID:
                                        ${escapeHtml(
                                            driver.employeeCode
                                        )}
                                    </small>
                                `

                                : ""
                        }
                    </div>


                    <div
                        class="fleet-info-card"
                    >
                        <span>
                            🛻 Ремарке
                        </span>

                        <strong
                            class="${
                                trailer
                                    ? ""
                                    : "fleet-warning-text"
                            }"
                        >
                            ${
                                trailer

                                    ? escapeHtml(
                                        trailer
                                            .registrationNumber
                                    )

                                    : "Няма закачено"
                            }
                        </strong>

                        ${
                            trailer?.permitNumber

                                ? `
                                    <small
                                        class="fleet-permit"
                                    >
                                        Разрешително
                                        ${escapeHtml(
                                            trailer
                                                .permitNumber
                                        )}
                                    </small>
                                `

                                : ""
                        }
                    </div>

                </div>


                <div
                    class="fleet-status-grid"
                >

                    <div
                        class="fleet-info-card"
                    >
                        <span>
                            Режим
                        </span>

                        <strong>
                            ${
                                assignment
                                    ?.assignmentMode ===
                                    "temporary_for_trip"

                                    ? "Временна композиция"

                                    : assignment
                                        ? "Постоянна композиция"
                                        : "Свободен"
                            }
                        </strong>
                    </div>


                    <div
                        class="fleet-info-card"
                    >
                        <span>
                            Състояние
                        </span>

                        <strong>
                            ${getOperationalLabel(
                                truck.id
                            )}
                        </strong>
                    </div>

                </div>


                <button
                    type="button"
                    class="
                        fleet-composition-button
                        ${
                            locked
                                ? "fleet-button-disabled"
                                : ""
                        }
                    "
                    data-fleet-action="edit-composition"
                    data-truck-id="${escapeHtml(
                        truck.id
                    )}"
                    ${
                        locked
                            ? "disabled"
                            : ""
                    }
                >
                    ${buttonLabel}
                </button>

            </div>

        </article>
    `;
}


/* =========================================================
   TRAILERS
   ========================================================= */


function renderTrailers(): void {
    if (!fleetSnapshot) {
        return;
    }

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3FleetTrailerList"
        );

    if (!container) {
        return;
    }

    if (
        fleetSnapshot.trailers.length ===
        0
    ) {
        container.innerHTML = `
            <div class="fleet-empty">
                Все още няма добавени
                ремаркета.
            </div>
        `;

        return;
    }

    container.innerHTML =
        fleetSnapshot.trailers
            .map(
                trailer => {
                    const assignment =
                        getActiveAssignmentByTrailer(
                            trailer.id
                        );

                    const truck =
                        assignment
                            ? getTruckById(
                                assignment
                                    .truckId
                            )
                            : null;

                    return `
                        <article
                            class="
                                fleet-trailer-card
                                ${
                                    truck
                                        ? "fleet-trailer-attached"
                                        : ""
                                }
                            "
                        >
                            <div
                                class="fleet-trailer-top"
                            >
                                <div>
                                    <strong>
                                        🛻
                                        ${escapeHtml(
                                            trailer
                                                .registrationNumber
                                        )}
                                    </strong>

                                    <div
                                        class="fleet-permit"
                                    >
                                        Разрешително
                                        ${escapeHtml(
                                            trailer
                                                .permitNumber ||
                                            "-"
                                        )}
                                    </div>
                                </div>


                                <span
                                    class="
                                        fleet-trailer-badge
                                        ${
                                            truck
                                                ? "fleet-trailer-badge-attached"
                                                : ""
                                        }
                                    "
                                >
                                    ${
                                        truck
                                            ? "🟢 Закачено"
                                            : "⚪ Свободно"
                                    }
                                </span>
                            </div>


                            ${
                                truck

                                    ? `
                                        <div
                                            class="fleet-trailer-truck"
                                        >
                                            Към:

                                            <strong>
                                                🚛
                                                ${escapeHtml(
                                                    truck
                                                        .registrationNumber
                                                )}
                                            </strong>
                                        </div>
                                    `

                                    : ""
                            }

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   DIALOG
   ========================================================= */


function showDialog(
    html: string
): void {
    const dialog =
        getDialog();

    if (!dialog) {
        return;
    }

    dialog.innerHTML =
        html;

    if (!dialog.open) {
        dialog.showModal();
    }
}


function closeDialog(): void {
    const dialog =
        getDialog();

    if (!dialog) {
        return;
    }

    dialog.close();

    dialog.innerHTML =
        "";
}


function dialogHeader(
    icon: string,
    title: string,
    subtitle: string
): string {
    return `
        <header
            class="fleet-dialog-header"
        >
            <div>
                <h3>
                    ${icon}
                    ${escapeHtml(title)}
                </h3>

                <p>
                    ${escapeHtml(subtitle)}
                </p>
            </div>

            <button
                type="button"
                class="fleet-dialog-close"
                data-fleet-action="close-dialog"
                aria-label="Затвори"
            >
                ✕
            </button>
        </header>
    `;
}


function renderDialogMessage():
    string {
    return `
        <div
            id="k3FleetDialogMessage"
            class="fleet-dialog-message"
            aria-live="polite"
        ></div>
    `;
}


function setDialogMessage(
    message: string
): void {
    const element =
        document.querySelector<
            HTMLElement
        >(
            "#k3FleetDialogMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.add(
        "fleet-dialog-message-visible"
    );
}


/* =========================================================
   ADD TRUCK
   ========================================================= */


function openAddTruckDialog():
    void {
    showDialog(`
        ${dialogHeader(
            "🚛",
            "Добави камион",
            "Камионът се добавя като отделна единица."
        )}

        <form
            id="k3AddTruckForm"
            class="fleet-dialog-form"
        >
            <label>
                Регистрационен номер

                <input
                    id="k3NewTruckNumber"
                    type="text"
                    autocomplete="off"
                    required
                    placeholder="Напр. КН 7502 XX"
                />
            </label>

            ${renderDialogMessage()}

            <button
                type="submit"
                class="
                    fleet-button
                    fleet-button-primary
                    fleet-dialog-submit
                "
            >
                ➕ Добави камион
            </button>
        </form>
    `);
}


/* =========================================================
   ADD TRAILER
   ========================================================= */


function openAddTrailerDialog():
    void {
    showDialog(`
        ${dialogHeader(
            "🛻",
            "Добави ремарке",
            "Разрешителното остава постоянно към това ремарке."
        )}

        <form
            id="k3AddTrailerForm"
            class="fleet-dialog-form"
        >
            <label>
                Регистрационен номер

                <input
                    id="k3NewTrailerNumber"
                    type="text"
                    autocomplete="off"
                    required
                    placeholder="Напр. КН 1234 ЕЕ"
                />
            </label>


            <label>
                Разрешително BIOEXIS

                <input
                    id="k3NewTrailerPermit"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]{3,4}"
                    maxlength="4"
                    autocomplete="off"
                    required
                    placeholder="3 или 4 цифри"
                />
            </label>

            ${renderDialogMessage()}

            <button
                type="submit"
                class="
                    fleet-button
                    fleet-button-success
                    fleet-dialog-submit
                "
            >
                ➕ Добави ремарке
            </button>
        </form>
    `);
}


/* =========================================================
   COMPOSITION
   ========================================================= */


function buildDriverOptions(
    truckId: string,
    selectedDriverId: string | null
): string {
    if (!fleetSnapshot) {
        return "";
    }

    const options =
        fleetSnapshot.drivers
            .map(
                driver => {
                    const assignment =
                        getActiveAssignmentByDriver(
                            driver.id
                        );

                    const homeTruckId =
                        getHomeTruckIdByDriver(
                            driver.id
                        );

                    const operationallyBlocked =
                        Boolean(
                            assignment &&
                            assignment.truckId !==
                                truckId
                        );

                    const homeBlocked =
                        Boolean(
                            homeTruckId &&
                            homeTruckId !==
                                truckId
                        );

                    const blocked =
                        operationallyBlocked ||
                        homeBlocked;

                    let blockedLabel =
                        "";

                    if (
                        assignment &&
                        assignment.truckId !==
                            truckId
                    ) {
                        const otherTruck =
                            getTruckById(
                                assignment
                                    .truckId
                            );

                        blockedLabel =
                            ` — 🔒 ${
                                otherTruck
                                    ?.registrationNumber ||
                                "зает"
                            }`;
                    } else if (
                        homeTruckId &&
                        homeTruckId !==
                            truckId
                    ) {
                        const homeTruck =
                            getTruckById(
                                homeTruckId
                            );

                        blockedLabel =
                            ` — 🏠 ${
                                homeTruck
                                    ?.registrationNumber ||
                                "друг камион"
                            }`;
                    }

                    return `
                        <option
                            value="${escapeHtml(
                                driver.id
                            )}"
                            ${
                                driver.id ===
                                selectedDriverId
                                    ? "selected"
                                    : ""
                            }
                            ${
                                blocked
                                    ? "disabled"
                                    : ""
                            }
                        >
                            ${escapeHtml(
                                driver.name
                            )}
                            ${escapeHtml(
                                blockedLabel
                            )}
                        </option>
                    `;
                }
            )
            .join("");

    return `
        <option value="">
            -- Няма шофьор --
        </option>

        ${options}
    `;
}


function buildTrailerOptions(
    truckId: string,
    selectedTrailerId: string | null
): string {
    if (!fleetSnapshot) {
        return "";
    }

    const options =
        fleetSnapshot.trailers
            .map(
                trailer => {
                    const assignment =
                        getActiveAssignmentByTrailer(
                            trailer.id
                        );

                    const blocked =
                        Boolean(
                            assignment &&
                            assignment.truckId !==
                                truckId
                        );

                    const otherTruck =
                        blocked &&
                        assignment
                            ? getTruckById(
                                assignment
                                    .truckId
                            )
                            : null;

                    const blockedLabel =
                        blocked
                            ? ` — 🔒 ${
                                otherTruck
                                    ?.registrationNumber ||
                                "заето"
                            }`
                            : "";

                    return `
                        <option
                            value="${escapeHtml(
                                trailer.id
                            )}"
                            ${
                                trailer.id ===
                                selectedTrailerId
                                    ? "selected"
                                    : ""
                            }
                            ${
                                blocked
                                    ? "disabled"
                                    : ""
                            }
                        >
                            ${escapeHtml(
                                trailer
                                    .registrationNumber
                            )}
                            —
                            Разрешително
                            ${escapeHtml(
                                trailer
                                    .permitNumber ||
                                "-"
                            )}
                            ${escapeHtml(
                                blockedLabel
                            )}
                        </option>
                    `;
                }
            )
            .join("");

    return `
        <option value="">
            -- Няма ремарке --
        </option>

        ${options}
    `;
}


function openCompositionDialog(
    truckId: string
): void {
    const truck =
        getTruckById(
            truckId
        );

    if (!truck) {
        return;
    }

    if (isTruckLocked(truckId)) {
        window.alert(
            "Композицията е заключена и не може да се променя в момента."
        );

        return;
    }

    const assignment =
        getActiveAssignmentByTruck(
            truckId
        );

    const selectedDriverId =
        getHomeDriverIdByTruck(
            truckId
        ) ||
        assignment?.driverId ||
        null;

    const selectedTrailerId =
        assignment?.trailerId ||
        null;

    showDialog(`
        ${dialogHeader(
            "🔗",
            "Композиция",
            `🚛 ${truck.registrationNumber}`
        )}

        <form
            id="k3CompositionForm"
            class="fleet-dialog-form"
            data-truck-id="${escapeHtml(
                truck.id
            )}"
        >

            <label>
                👤 Постоянен шофьор

                <select
                    id="k3CompositionDriver"
                >
                    ${buildDriverOptions(
                        truck.id,
                        selectedDriverId
                    )}
                </select>
            </label>


            <label>
                🛻 Ремарке

                <select
                    id="k3CompositionTrailer"
                >
                    ${buildTrailerOptions(
                        truck.id,
                        selectedTrailerId
                    )}
                </select>
            </label>


            ${renderDialogMessage()}


            <div
                class="fleet-dialog-actions"
            >
                <button
                    type="submit"
                    class="
                        fleet-button
                        fleet-button-success
                    "
                >
                    ✅ Запази композицията
                </button>

                <button
                    type="button"
                    class="
                        fleet-button
                        fleet-button-danger
                    "
                    data-fleet-action="release-truck"
                    data-truck-id="${escapeHtml(
                        truck.id
                    )}"
                >
                    🔓 Разкачи всичко
                </button>
            </div>

        </form>
    `);
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refreshFleet():
    Promise<void> {
    const currentRefresh =
        ++refreshVersion;

    const status =
        document.querySelector<
            HTMLElement
        >(
            "#k3FleetStatus"
        );

    if (status) {
        status.textContent =
            "Зареждане...";
    }

    try {
        const snapshot =
            await loadFleetSnapshot();

        if (
            currentRefresh !==
            refreshVersion
        ) {
            return;
        }

        const root =
            getRoot();

        if (!root?.isConnected) {
            return;
        }

        fleetSnapshot =
            snapshot;

        renderToolbar();

        renderTruckCards();

        renderTrailers();

        if (status) {
            status.textContent =
                "";
        }

    } catch (error) {
        if (
            currentRefresh !==
            refreshVersion
        ) {
            return;
        }

        if (status) {
            status.textContent =
                errorMessage(error);

            status.classList.add(
                "fleet-status-error"
            );
        }
    }
}


/* =========================================================
   SUBMIT EVENTS
   ========================================================= */


async function handleSubmit(
    event: SubmitEvent
): Promise<void> {
    const form =
        event.target;

    if (
        !(form instanceof
            HTMLFormElement)
    ) {
        return;
    }


    if (
        form.id ===
        "k3AddTruckForm"
    ) {
        event.preventDefault();

        const input =
            form.querySelector<
                HTMLInputElement
            >(
                "#k3NewTruckNumber"
            );

        const submit =
            form.querySelector<
                HTMLButtonElement
            >(
                '[type="submit"]'
            );

        if (
            !input ||
            !submit
        ) {
            return;
        }

        submit.disabled =
            true;

        try {
            await createFleetTruck(
                input.value
            );

            closeDialog();

            await refreshFleet();

        } catch (error) {
            setDialogMessage(
                errorMessage(error)
            );

            submit.disabled =
                false;
        }

        return;
    }


    if (
        form.id ===
        "k3AddTrailerForm"
    ) {
        event.preventDefault();

        const numberInput =
            form.querySelector<
                HTMLInputElement
            >(
                "#k3NewTrailerNumber"
            );

        const permitInput =
            form.querySelector<
                HTMLInputElement
            >(
                "#k3NewTrailerPermit"
            );

        const submit =
            form.querySelector<
                HTMLButtonElement
            >(
                '[type="submit"]'
            );

        if (
            !numberInput ||
            !permitInput ||
            !submit
        ) {
            return;
        }

        submit.disabled =
            true;

        try {
            await createFleetTrailer(
                numberInput.value,
                permitInput.value
            );

            closeDialog();

            await refreshFleet();

        } catch (error) {
            setDialogMessage(
                errorMessage(error)
            );

            submit.disabled =
                false;
        }

        return;
    }


    if (
        form.id ===
        "k3CompositionForm"
    ) {
        event.preventDefault();

        const truckId =
            form.dataset.truckId;

        const driverSelect =
            form.querySelector<
                HTMLSelectElement
            >(
                "#k3CompositionDriver"
            );

        const trailerSelect =
            form.querySelector<
                HTMLSelectElement
            >(
                "#k3CompositionTrailer"
            );

        const submit =
            form.querySelector<
                HTMLButtonElement
            >(
                '[type="submit"]'
            );

        if (
            !truckId ||
            !driverSelect ||
            !trailerSelect ||
            !submit
        ) {
            return;
        }

        submit.disabled =
            true;

        try {
            await savePermanentComposition(
                truckId,

                driverSelect.value ||
                    null,

                trailerSelect.value ||
                    null
            );

            closeDialog();

            await refreshFleet();

        } catch (error) {
            setDialogMessage(
                errorMessage(error)
            );

            submit.disabled =
                false;
        }
    }
}


/* =========================================================
   CLICK EVENTS
   ========================================================= */


async function handleClick(
    event: MouseEvent
): Promise<void> {
    const target =
        event.target;

    if (
        !(target instanceof
            Element)
    ) {
        return;
    }

    const button =
        target.closest<
            HTMLButtonElement
        >(
            "[data-fleet-action]"
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset.fleetAction;


    if (
        action === "add-truck"
    ) {
        openAddTruckDialog();

        return;
    }


    if (
        action === "add-trailer"
    ) {
        openAddTrailerDialog();

        return;
    }


    if (
        action ===
        "close-dialog"
    ) {
        closeDialog();

        return;
    }


    if (
        action ===
        "edit-composition"
    ) {
        const truckId =
            button.dataset.truckId;

        if (truckId) {
            openCompositionDialog(
                truckId
            );
        }

        return;
    }


    if (
        action ===
        "release-truck"
    ) {
        const truckId =
            button.dataset.truckId;

        if (!truckId) {
            return;
        }

        const truck =
            getTruckById(
                truckId
            );

        if (!truck) {
            return;
        }

        const confirmed =
            window.confirm(
                `Да разкача ли шофьора и ремаркето от ${truck.registrationNumber}?`
            );

        if (!confirmed) {
            return;
        }

        button.disabled =
            true;

        try {
            await releaseFleetTruck(
                truckId
            );

            closeDialog();

            await refreshFleet();

        } catch (error) {
            setDialogMessage(
                errorMessage(error)
            );

            button.disabled =
                false;
        }
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function initializeSection():
    Promise<void> {
    const root =
        getRoot();

    const dialog =
        getDialog();

    if (
        !root ||
        !dialog
    ) {
        return;
    }

    root.addEventListener(
        "click",
        event => {
            void handleClick(event);
        }
    );

    root.addEventListener(
        "submit",
        event => {
            void handleSubmit(event);
        }
    );

    dialog.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                dialog
            ) {
                closeDialog();
            }
        }
    );

    await refreshFleet();
}
