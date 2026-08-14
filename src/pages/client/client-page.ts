import "./client-page.css";

import {
    createClientOrder,
    loadClientActiveOrders,
    loadClientOrdersForDate,
    loadClientPortalContext,
    updateClientOrder,
    type ClientOrder,
    type ClientOrderStatus,
    type ClientPortalContext
} from "../../features/orders/client-orders-service";

import {
    logoutCurrentSession
} from "../../features/auth/logout";

import {
    escapeHtml
} from "../../shared/lib/html";


let context:
    ClientPortalContext | null =
    null;


let activeOrders:
    ClientOrder[] =
    [];


let calendarOrders:
    ClientOrder[] =
    [];


let refreshVersion =
    0;


/* =========================================================
   HELPERS
   ========================================================= */


function formatTons(
    value: number
): string {

    return value
        .toFixed(3)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
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
        return "-";
    }


    return date
        .toLocaleString(
            "bg-BG"
        );
}


function localDateInputValue():
string {

    const now =
        new Date();


    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;
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


function statusLabel(
    status: ClientOrderStatus
): string {

    switch (status) {

        case "pending":
            return "⏳ Очаква зачисляване";

        case "partial":
            return "🟡 Частично зачислена";

        case "assigned":
            return "✅ Зачислена";

        case "in_progress":
            return "🚛 В курс";

        case "completed":
            return "✅ Приключена";

        case "cancelled":
            return "⛔ Отказана";
    }
}


function activeAssignments(
    order: ClientOrder
) {

    return order.assignments
        .filter(
            assignment =>
                assignment.status !==
                    "cancelled"
        );
}


function assignedTons(
    order: ClientOrder
): number {

    return activeAssignments(order)
        .reduce(
            (
                total,
                assignment
            ) =>
                total +
                assignment
                    .assignedTons,
            0
        );
}


function isEditLocked(
    order: ClientOrder
): boolean {

    if (
        order.status ===
            "in_progress" ||
        order.status ===
            "completed" ||
        order.status ===
            "cancelled"
    ) {
        return true;
    }


    const started =
        new Set([
            "accepted",
            "en_route",
            "arrived",
            "loaded",
            "completed"
        ]);


    return activeAssignments(order)
        .some(
            assignment =>
                started.has(
                    assignment.status
                )
        );
}


function setPageMessage(
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
            "#k3ClientMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;

    element.className =
        "client-page-message";


    if (type) {
        element.classList.add(
            `client-page-message-${type}`
        );
    }
}


/* =========================================================
   PAGE
   ========================================================= */


export function renderPage():
string {

    return `
        <div
            id="k3ClientPortal"
            class="client-portal"
        >

            <header
                class="client-topbar"
            >
                <div
                    class="client-brand"
                >
                    <div
                        class="client-brand-logo"
                    >
                        K3
                    </div>

                    <div>
                        <strong>
                            K3 Logistics
                        </strong>

                        <span>
                            Клиентски портал
                        </span>
                    </div>
                </div>


                <button
                    type="button"
                    class="client-logout"
                    data-client-action="logout"
                >
                    Изход
                </button>
            </header>


            <main
                class="client-main"
            >

                <section
                    class="client-welcome"
                >
                    <div>
                        <span>
                            Добре дошли
                        </span>

                        <h1
                            id="k3ClientName"
                        >
                            Клиент
                        </h1>

                        <p
                            id="k3ClientCompany"
                        ></p>
                    </div>
                </section>


                <div
                    id="k3ClientMessage"
                    class="client-page-message"
                    aria-live="polite"
                ></div>


                <div
                    class="client-main-grid"
                >

                    <section
                        class="client-panel"
                    >

                        <header
                            class="client-panel-header"
                        >
                            <h2>
                                📦 Нова заявка
                            </h2>

                            <p>
                                Изберете обект и
                                количеството товар.
                            </p>
                        </header>


                        <form
                            id="k3ClientOrderForm"
                            class="client-order-form"
                        >

                            <label>
                                Обект

                                <select
                                    id="k3ClientOrderSite"
                                    required
                                >
                                    <option value="">
                                        Зареждане...
                                    </option>
                                </select>
                            </label>


                            <label>
                                Приблизителни тонове

                                <input
                                    id="k3ClientOrderTons"
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    required
                                    placeholder="Напр. 18"
                                />
                            </label>


                            <label>
                                Забележка

                                <textarea
                                    id="k3ClientOrderNote"
                                    rows="5"
                                    placeholder="Напр. Готови сме след 14:00 ч."
                                ></textarea>
                            </label>


                            <button
                                id="k3ClientOrderSubmit"
                                type="submit"
                                class="client-primary-button"
                            >
                                📦 Изпрати заявка
                            </button>

                        </form>

                    </section>


                    <section
                        class="client-panel"
                    >

                        <header
                            class="client-panel-header client-panel-header-row"
                        >
                            <div>
                                <h2>
                                    🚚 Активни заявки
                                </h2>

                                <p>
                                    Текущ статус и
                                    зачислени камиони
                                </p>
                            </div>


                            <span
                                id="k3ClientActiveCount"
                                class="client-count"
                            >
                                0
                            </span>
                        </header>


                        <div
                            id="k3ClientActiveOrders"
                            class="client-orders-list"
                        >
                            <div
                                class="client-empty"
                            >
                                Зареждане...
                            </div>
                        </div>

                    </section>

                </div>


                <section
                    class="client-panel client-history-panel"
                >

                    <header
                        class="client-panel-header client-panel-header-row"
                    >
                        <div>
                            <h2>
                                📅 История на поръчките
                            </h2>

                            <p>
                                Завършените и старите заявки
                                остават запазени.
                            </p>
                        </div>


                        <button
                            type="button"
                            class="client-calendar-button"
                            data-client-action="toggle-calendar"
                        >
                            📅 Календар на поръчките
                        </button>
                    </header>


                    <div
                        id="k3ClientCalendarPanel"
                        class="client-calendar-panel"
                        hidden
                    >

                        <div
                            class="client-calendar-controls"
                        >
                            <label>
                                Избери дата

                                <input
                                    id="k3ClientCalendarDate"
                                    type="date"
                                />
                            </label>


                            <button
                                type="button"
                                class="client-primary-button"
                                data-client-action="load-calendar"
                            >
                                Покажи заявките
                            </button>
                        </div>


                        <div
                            id="k3ClientCalendarOrders"
                            class="client-orders-list"
                        >
                            <div
                                class="client-empty"
                            >
                                Изберете дата.
                            </div>
                        </div>

                    </div>

                </section>

            </main>


            <dialog
                id="k3ClientEditDialog"
                class="client-edit-dialog"
            ></dialog>

        </div>
    `;
}


/* =========================================================
   CONTEXT
   ========================================================= */


function renderContext():
void {

    if (!context) {
        return;
    }


    const name =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientName"
        );


    const company =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientCompany"
        );


    const siteSelect =
        document.querySelector<
            HTMLSelectElement
        >(
            "#k3ClientOrderSite"
        );


    if (name) {
        name.textContent =
            context.displayName;
    }


    if (company) {
        company.textContent =
            `🏢 ${context.companyName}`;
    }


    if (!siteSelect) {
        return;
    }


    if (
        context.sites.length ===
        0
    ) {
        siteSelect.innerHTML = `
            <option value="">
                Няма активни обекти
            </option>
        `;

        siteSelect.disabled =
            true;

        return;
    }


    siteSelect.disabled =
        false;


    siteSelect.innerHTML =
        `
            <option value="">
                -- Избери обект --
            </option>
        ` +
        context.sites
            .map(
                site => `
                    <option
                        value="${escapeHtml(
                            site.id
                        )}"
                    >
                        ${escapeHtml(
                            site.name
                        )}
                        —
                        ${escapeHtml(
                            site.address
                        )}
                    </option>
                `
            )
            .join("");
}


/* =========================================================
   ORDER CARDS
   ========================================================= */


function assignmentHtml(
    order: ClientOrder
): string {

    const assignments =
        activeAssignments(order);


    if (
        assignments.length === 0
    ) {
        return `
            <div
                class="client-waiting"
            >
                ⏳ Очаква зачисляване
            </div>
        `;
    }


    const totalAssigned =
        assignedTons(order);


    const remaining =
        Math.max(
            order.requestedTons -
            totalAssigned,
            0
        );


    return `
        <div
            class="client-assignment-box"
        >

            ${
                assignments
                    .map(
                        assignment => `
                            <div
                                class="client-assignment"
                            >
                                <strong>
                                    🚛
                                    ${escapeHtml(
                                        assignment.truckNumber ||
                                        "Камион"
                                    )}
                                </strong>

                                <span>
                                    ⚖️
                                    ${escapeHtml(
                                        formatTons(
                                            assignment.assignedTons
                                        )
                                    )}
                                    т.
                                </span>

                                ${
                                    assignment.trailerNumber

                                        ? `
                                            <span>
                                                🛻
                                                ${escapeHtml(
                                                    assignment.trailerNumber
                                                )}

                                                ${
                                                    assignment.trailerPermit
                                                        ? ` • Permit ${escapeHtml(
                                                            assignment.trailerPermit
                                                        )}`
                                                        : ""
                                                }
                                            </span>
                                        `

                                        : ""
                                }
                            </div>
                        `
                    )
                    .join("")
            }


            <div
                class="client-remaining"
            >
                Остатък:

                <strong>
                    ${escapeHtml(
                        formatTons(
                            remaining
                        )
                    )}
                    т.
                </strong>
            </div>

        </div>
    `;
}


function renderOrderCard(
    order: ClientOrder,
    showEdit: boolean
): string {

    const locked =
        isEditLocked(order);


    return `
        <article
            class="client-order-card"
        >

            <header
                class="client-order-header"
            >
                <div>
                    <span>
                        Заявка
                        #${escapeHtml(
                            order.orderNumber
                        )}
                    </span>

                    <strong>
                        ⚖️
                        ${escapeHtml(
                            formatTons(
                                order.requestedTons
                            )
                        )}
                        т.
                    </strong>
                </div>


                <span
                    class="
                        client-status
                        client-status-${escapeHtml(
                            order.status
                        )}
                    "
                >
                    ${escapeHtml(
                        statusLabel(
                            order.status
                        )
                    )}
                </span>
            </header>


            <div
                class="client-order-site"
            >
                <strong>
                    📍
                    ${escapeHtml(
                        order.siteName
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        order.siteAddress
                    )}
                </span>
            </div>


            ${
                order.note

                    ? `
                        <div
                            class="client-order-note"
                        >
                            📝
                            ${escapeHtml(
                                order.note
                            )}
                        </div>
                    `

                    : ""
            }


            <div
                class="client-order-date"
            >
                ${escapeHtml(
                    formatDate(
                        order.createdAt
                    )
                )}
            </div>


            ${assignmentHtml(order)}


            ${
                showEdit

                    ? locked

                        ? `
                            <div
                                class="client-edit-locked"
                            >
                                🔒 Курсът е започнал —
                                редакцията е заключена.
                            </div>
                        `

                        : `
                            <button
                                type="button"
                                class="client-edit-button"
                                data-client-action="edit-order"
                                data-order-id="${escapeHtml(
                                    order.id
                                )}"
                            >
                                ✏️ Редактирай заявката
                            </button>
                        `

                    : ""
            }

        </article>
    `;
}


/* =========================================================
   ACTIVE ORDERS
   ========================================================= */


function renderActiveOrders():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientActiveOrders"
        );


    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientActiveCount"
        );


    if (
        !container ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            activeOrders.length
        );


    if (
        activeOrders.length ===
        0
    ) {
        container.innerHTML = `
            <div
                class="client-empty"
            >
                В момента няма активни заявки.
            </div>
        `;

        return;
    }


    container.innerHTML =
        activeOrders
            .map(
                order =>
                    renderOrderCard(
                        order,
                        true
                    )
            )
            .join("");
}


/* =========================================================
   CALENDAR
   ========================================================= */


function renderCalendarOrders():
void {

    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientCalendarOrders"
        );


    if (!container) {
        return;
    }


    if (
        calendarOrders.length ===
        0
    ) {
        container.innerHTML = `
            <div
                class="client-empty"
            >
                Няма заявки за избраната дата.
            </div>
        `;

        return;
    }


    container.innerHTML =
        calendarOrders
            .map(
                order =>
                    renderOrderCard(
                        order,
                        false
                    )
            )
            .join("");
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refreshActiveOrders():
Promise<void> {

    if (!context) {
        return;
    }


    const version =
        ++refreshVersion;


    try {

        const orders =
            await loadClientActiveOrders(
                context.companyId
            );


        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        activeOrders =
            orders;


        renderActiveOrders();


    } catch (error) {

        setPageMessage(
            errorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   CREATE
   ========================================================= */


async function submitOrder(
    form: HTMLFormElement
): Promise<void> {

    const site =
        form.querySelector<
            HTMLSelectElement
        >(
            "#k3ClientOrderSite"
        );


    const tons =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3ClientOrderTons"
        );


    const note =
        form.querySelector<
            HTMLTextAreaElement
        >(
            "#k3ClientOrderNote"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3ClientOrderSubmit"
        );


    if (
        !site ||
        !tons ||
        !note ||
        !button
    ) {
        return;
    }


    const requestedTons =
        Number(
            tons.value
        );


    if (
        !site.value
    ) {
        setPageMessage(
            "Изберете обект.",
            "error"
        );

        return;
    }


    if (
        !Number.isFinite(
            requestedTons
        ) ||
        requestedTons <= 0
    ) {
        setPageMessage(
            "Въведете валидно количество.",
            "error"
        );

        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Изпращане...";


    try {

        await createClientOrder(
            site.value,
            requestedTons,
            note.value
        );


        form.reset();


        setPageMessage(
            "Заявката е изпратена успешно.",
            "success"
        );


        await refreshActiveOrders();


    } catch (error) {

        setPageMessage(
            errorMessage(error),
            "error"
        );


    } finally {

        button.disabled =
            false;

        button.textContent =
            "📦 Изпрати заявка";
    }
}


/* =========================================================
   EDIT
   ========================================================= */


function openEditDialog(
    orderId: string
): void {

    const order =
        activeOrders.find(
            item =>
                item.id ===
                orderId
        );


    if (
        !order ||
        isEditLocked(order)
    ) {
        return;
    }


    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3ClientEditDialog"
        );


    if (!dialog) {
        return;
    }


    const alreadyAssigned =
        assignedTons(order);


    dialog.innerHTML = `
        <form
            id="k3ClientEditForm"
            class="client-edit-form"
            data-order-id="${escapeHtml(
                order.id
            )}"
        >

            <header
                class="client-edit-header"
            >
                <div>
                    <h2>
                        ✏️ Редакция
                    </h2>

                    <p>
                        Заявка
                        #${escapeHtml(
                            order.orderNumber
                        )}
                    </p>
                </div>


                <button
                    type="button"
                    class="client-dialog-close"
                    data-client-action="close-edit"
                >
                    ✕
                </button>
            </header>


            ${
                alreadyAssigned > 0

                    ? `
                        <div
                            class="client-edit-info"
                        >
                            Вече са зачислени
                            <strong>
                                ${escapeHtml(
                                    formatTons(
                                        alreadyAssigned
                                    )
                                )}
                                т.
                            </strong>

                            Новият общ тонаж
                            не може да бъде по-малък.
                        </div>
                    `

                    : ""
            }


            <label>
                Тонове

                <input
                    id="k3ClientEditTons"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value="${escapeHtml(
                        order.requestedTons
                    )}"
                />
            </label>


            <label>
                Забележка

                <textarea
                    id="k3ClientEditNote"
                    rows="5"
                >${escapeHtml(
                    order.note || ""
                )}</textarea>
            </label>


            <button
                id="k3ClientEditSave"
                type="submit"
                class="client-primary-button"
            >
                💾 Запази промените
            </button>

        </form>
    `;


    dialog.showModal();
}


function closeEditDialog():
void {

    const dialog =
        document.querySelector<
            HTMLDialogElement
        >(
            "#k3ClientEditDialog"
        );


    if (
        dialog?.open
    ) {
        dialog.close();
    }
}


async function submitEdit(
    form: HTMLFormElement
): Promise<void> {

    const orderId =
        form.dataset.orderId;


    const tons =
        form.querySelector<
            HTMLInputElement
        >(
            "#k3ClientEditTons"
        );


    const note =
        form.querySelector<
            HTMLTextAreaElement
        >(
            "#k3ClientEditNote"
        );


    const button =
        form.querySelector<
            HTMLButtonElement
        >(
            "#k3ClientEditSave"
        );


    if (
        !orderId ||
        !tons ||
        !note ||
        !button
    ) {
        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Запазване...";


    try {

        await updateClientOrder(
            orderId,
            Number(
                tons.value
            ),
            note.value
        );


        closeEditDialog();


        setPageMessage(
            "Заявката е редактирана успешно.",
            "success"
        );


        await refreshActiveOrders();


    } catch (error) {

        setPageMessage(
            errorMessage(error),
            "error"
        );


    } finally {

        button.disabled =
            false;

        button.textContent =
            "💾 Запази промените";
    }
}


/* =========================================================
   EVENTS
   ========================================================= */


async function handleSubmit(
    event: Event
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
        "k3ClientOrderForm"
    ) {
        event.preventDefault();

        await submitOrder(
            form
        );

        return;
    }


    if (
        form.id ===
        "k3ClientEditForm"
    ) {
        event.preventDefault();

        await submitEdit(
            form
        );
    }
}


async function handleClick(
    event: Event
): Promise<void> {

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
            "[data-client-action]"
        );


    if (!button) {
        return;
    }


    const action =
        button.dataset.clientAction;


    if (
        action === "logout"
    ) {

        button.disabled =
            true;

        try {
            await logoutCurrentSession();
        } catch (error) {
            button.disabled =
                false;

            setPageMessage(
                errorMessage(error),
                "error"
            );
        }

        return;
    }


    if (
        action === "edit-order"
    ) {

        const orderId =
            button.dataset.orderId;

        if (orderId) {
            openEditDialog(
                orderId
            );
        }

        return;
    }


    if (
        action === "close-edit"
    ) {
        closeEditDialog();

        return;
    }


    if (
        action === "toggle-calendar"
    ) {

        const panel =
            document.querySelector<
                HTMLElement
            >(
                "#k3ClientCalendarPanel"
            );


        if (!panel) {
            return;
        }


        panel.hidden =
            !panel.hidden;


        return;
    }


    if (
        action === "load-calendar"
    ) {

        if (!context) {
            return;
        }


        const input =
            document.querySelector<
                HTMLInputElement
            >(
                "#k3ClientCalendarDate"
            );


        if (
            !input ||
            !input.value
        ) {
            setPageMessage(
                "Изберете дата.",
                "error"
            );

            return;
        }


        button.disabled =
            true;


        try {

            calendarOrders =
                await loadClientOrdersForDate(
                    context.companyId,
                    input.value
                );


            renderCalendarOrders();


        } catch (error) {

            setPageMessage(
                errorMessage(error),
                "error"
            );


        } finally {

            button.disabled =
                false;
        }
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */


export async function initializePage():
Promise<void> {

    const root =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientPortal"
        );


    if (!root) {
        return;
    }


    root.addEventListener(
        "submit",
        event => {
            void handleSubmit(
                event
            );
        }
    );


    root.addEventListener(
        "click",
        event => {
            void handleClick(
                event
            );
        }
    );


    const dateInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3ClientCalendarDate"
        );


    if (dateInput) {
        dateInput.value =
            localDateInputValue();
    }


    try {

        context =
            await loadClientPortalContext();


        renderContext();


        activeOrders =
            await loadClientActiveOrders(
                context.companyId
            );


        renderActiveOrders();


    } catch (error) {

        setPageMessage(
            errorMessage(error),
            "error"
        );
    }
}
