import "./orders-section.css";

import {
    createClientAccount,
    createClientCompany,
    createClientSite,
    loadClientManagementSnapshot,
    type ClientCompany,
    type ClientManagementSnapshot
} from "../../../features/clients/client-service";

import {
    loadAdminActiveOrders,
    type AdminOrderListItem,
    type AdminOrderStatus
} from "../../../features/orders/admin-orders-service";

import {
    escapeHtml
} from "../../../shared/lib/html";


let clients:
    ClientManagementSnapshot | null =
    null;


let orders:
    AdminOrderListItem[] =
    [];


let refreshVersion =
    0;


/* =========================================================
   PAGE
   ========================================================= */


export function renderSection():
string {

    return `
        <section
            id="k3OrdersSection"
            class="orders-section"
        >

            <div
                id="k3OrdersPageMessage"
                class="orders-page-message"
                aria-live="polite"
            ></div>


            <section
                class="orders-panel"
            >

                <header
                    class="orders-panel-header"
                >
                    <div>
                        <h3>
                            📦 Активни заявки
                        </h3>

                        <p>
                            Текущи заявки,
                            които още не са
                            приключени.
                        </p>
                    </div>

                    <span
                        id="k3ActiveOrdersCount"
                        class="orders-count"
                    >
                        0
                    </span>
                </header>


                <div
                    id="k3ActiveOrdersList"
                    class="orders-list"
                >
                    <div
                        class="orders-loading"
                    >
                        Зареждане...
                    </div>
                </div>

            </section>


            <section
                class="
                    orders-panel
                    client-management-panel
                "
            >

                <header
                    class="orders-panel-header"
                >
                    <div>
                        <h3>
                            🏢 Клиенти и обекти
                        </h3>

                        <p>
                            Фирма → обекти →
                            клиентски акаунти
                        </p>
                    </div>
                </header>


                <div
                    id="k3ClientManagement"
                    class="client-management"
                >
                    <div
                        class="orders-loading"
                    >
                        Зареждане...
                    </div>
                </div>

            </section>

        </section>
    `;
}


/* =========================================================
   HELPERS
   ========================================================= */


function getRoot():
HTMLElement | null {

    return document.querySelector(
        "#k3OrdersSection"
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


function formatTons(
    value: number
): string {

    if (
        Number.isInteger(value)
    ) {
        return String(value);
    }

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

    return date.toLocaleString(
        "bg-BG"
    );
}


function statusLabel(
    status: AdminOrderStatus
): string {

    switch (status) {

        case "pending":
            return "🟡 Чака зачисляване";

        case "partial":
            return "🟠 Частично зачислена";

        case "assigned":
            return "🟢 Зачислена";

        case "in_progress":
            return "🔵 В курс";

        case "completed":
            return "✅ Приключена";

        case "cancelled":
            return "⛔ Отказана";
    }
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
            "#k3OrdersPageMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;

    element.className =
        "orders-page-message";


    if (type) {
        element.classList.add(
            `orders-page-message-${type}`
        );
    }
}


/* =========================================================
   ORDERS
   ========================================================= */


function renderOrders():
void {

    const list =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersList"
        );


    const count =
        document.querySelector<
            HTMLElement
        >(
            "#k3ActiveOrdersCount"
        );


    if (
        !list ||
        !count
    ) {
        return;
    }


    count.textContent =
        String(
            orders.length
        );


    if (
        orders.length === 0
    ) {

        list.innerHTML = `
            <div class="orders-empty">
                В момента няма активни заявки.
            </div>
        `;

        return;
    }


    list.innerHTML =
        orders
            .map(
                order => `
                    <article
                        class="order-card"
                    >

                        <header
                            class="order-card-header"
                        >
                            <div>
                                <strong>
                                    📦 Заявка
                                    #${escapeHtml(
                                        order.orderNumber
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        formatDate(
                                            order.createdAt
                                        )
                                    )}
                                </span>
                            </div>

                            <div
                                class="
                                    order-status
                                    order-status-${escapeHtml(
                                        order.status
                                    )}
                                "
                            >
                                ${escapeHtml(
                                    statusLabel(
                                        order.status
                                    )
                                )}
                            </div>
                        </header>


                        <div
                            class="order-card-grid"
                        >

                            <div
                                class="order-info"
                            >
                                <span>
                                    Фирма
                                </span>

                                <strong>
                                    🏢
                                    ${escapeHtml(
                                        order.companyName
                                    )}
                                </strong>
                            </div>


                            <div
                                class="order-info"
                            >
                                <span>
                                    Обект
                                </span>

                                <strong>
                                    📍
                                    ${escapeHtml(
                                        order.siteName
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        order.siteAddress
                                    )}
                                </small>
                            </div>


                            <div
                                class="order-info"
                            >
                                <span>
                                    Количество
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        formatTons(
                                            order.requestedTons
                                        )
                                    )}
                                    т.
                                </strong>
                            </div>

                        </div>


                        ${
                            order.note

                                ? `
                                    <div
                                        class="order-note"
                                    >
                                        📝
                                        ${escapeHtml(
                                            order.note
                                        )}
                                    </div>
                                `

                                : ""
                        }

                    </article>
                `
            )
            .join("");
}


/* =========================================================
   COMPANY SELECT
   ========================================================= */


function companyOptions(
    companies: ClientCompany[]
): string {

    if (
        companies.length === 0
    ) {
        return `
            <option value="">
                Няма създадени фирми
            </option>
        `;
    }


    return `
        <option value="">
            -- Избери фирма --
        </option>

        ${
            companies
                .map(
                    company => `
                        <option
                            value="${escapeHtml(
                                company.id
                            )}"
                        >
                            ${escapeHtml(
                                company.companyName
                            )}
                        </option>
                    `
                )
                .join("")
        }
    `;
}


/* =========================================================
   CLIENT MANAGEMENT
   ========================================================= */


function renderClientManagement():
void {

    if (!clients) {
        return;
    }


    const container =
        document.querySelector<
            HTMLElement
        >(
            "#k3ClientManagement"
        );


    if (!container) {
        return;
    }


    const options =
        companyOptions(
            clients.companies
        );


    container.innerHTML = `

        <div
            class="client-management-forms"
        >

            <!-- COMPANY -->

            <section
                class="client-form-card"
            >

                <h4>
                    🏢 Нова фирма
                </h4>

                <form
                    id="k3CreateCompanyForm"
                    class="client-form"
                >

                    <label>
                        Име на фирмата

                        <input
                            id="k3CompanyName"
                            type="text"
                            required
                            maxlength="160"
                        />
                    </label>


                    <label>
                        Лице за контакт

                        <input
                            id="k3CompanyContact"
                            type="text"
                            maxlength="120"
                        />
                    </label>


                    <label>
                        Телефон

                        <input
                            id="k3CompanyPhone"
                            type="tel"
                            maxlength="40"
                        />
                    </label>


                    <label>
                        Email

                        <input
                            id="k3CompanyEmail"
                            type="email"
                            maxlength="160"
                        />
                    </label>


                    <label>
                        Адрес на фирмата

                        <input
                            id="k3CompanyAddress"
                            type="text"
                            maxlength="250"
                        />
                    </label>


                    <button
                        type="submit"
                        class="
                            client-submit
                            client-submit-blue
                        "
                    >
                        ➕ Създай фирма
                    </button>

                </form>

            </section>


            <!-- SITE -->

            <section
                class="client-form-card"
            >

                <h4>
                    📍 Нов обект
                </h4>

                <form
                    id="k3CreateSiteForm"
                    class="client-form"
                >

                    <label>
                        Фирма

                        <select
                            id="k3SiteCompany"
                            required
                        >
                            ${options}
                        </select>
                    </label>


                    <label>
                        Име на обекта

                        <input
                            id="k3SiteName"
                            type="text"
                            required
                            maxlength="160"
                            placeholder="Склад София"
                        />
                    </label>


                    <label>
                        Адрес

                        <input
                            id="k3SiteAddress"
                            type="text"
                            required
                            maxlength="250"
                        />
                    </label>


                    <label>
                        Лице за контакт

                        <input
                            id="k3SiteContact"
                            type="text"
                            maxlength="120"
                        />
                    </label>


                    <label>
                        Телефон

                        <input
                            id="k3SitePhone"
                            type="tel"
                            maxlength="40"
                        />
                    </label>


                    <div
                        class="client-coordinates"
                    >
                        <label>
                            Latitude

                            <input
                                id="k3SiteLatitude"
                                type="number"
                                step="any"
                                placeholder="по желание"
                            />
                        </label>

                        <label>
                            Longitude

                            <input
                                id="k3SiteLongitude"
                                type="number"
                                step="any"
                                placeholder="по желание"
                            />
                        </label>
                    </div>


                    <button
                        type="submit"
                        class="
                            client-submit
                            client-submit-green
                        "
                        ${
                            clients.companies.length === 0
                                ? "disabled"
                                : ""
                        }
                    >
                        ➕ Създай обект
                    </button>

                </form>

            </section>


            <!-- CLIENT ACCOUNT -->

            <section
                class="client-form-card"
            >

                <h4>
                    👤 Клиентски акаунт
                </h4>

                <form
                    id="k3CreateClientForm"
                    class="client-form"
                >

                    <label>
                        Фирма

                        <select
                            id="k3ClientCompany"
                            required
                        >
                            ${options}
                        </select>
                    </label>


                    <label>
                        Име

                        <input
                            id="k3ClientName"
                            type="text"
                            required
                            maxlength="120"
                        />
                    </label>


                    <label>
                        Телефон

                        <input
                            id="k3ClientPhone"
                            type="tel"
                            maxlength="40"
                        />
                    </label>


                    <label>
                        Потребителско ID

                        <input
                            id="k3ClientLogin"
                            type="text"
                            required
                            minlength="3"
                            maxlength="32"
                            pattern="[A-Za-z0-9._-]+"
                            autocapitalize="none"
                            spellcheck="false"
                        />
                    </label>


                    <label>
                        Парола

                        <div
                            class="client-password-row"
                        >
                            <input
                                id="k3ClientPassword"
                                type="password"
                                required
                                minlength="8"
                                autocomplete="new-password"
                            />

                            <button
                                type="button"
                                class="client-password-toggle"
                                data-orders-action="toggle-client-password"
                                aria-label="Покажи паролата"
                            >
                                👁
                            </button>
                        </div>
                    </label>


                    <button
                        type="submit"
                        class="
                            client-submit
                            client-submit-orange
                        "
                        ${
                            clients.companies.length === 0
                                ? "disabled"
                                : ""
                        }
                    >
                        ➕ Създай клиент
                    </button>

                </form>

            </section>

        </div>


        <section
            class="client-directory"
        >

            <header
                class="client-directory-header"
            >
                <h4>
                    📋 Клиентска структура
                </h4>

                <span>
                    ${clients.companies.length}
                    фирми
                </span>
            </header>


            <div
                class="client-company-list"
            >
                ${renderCompanies()}
            </div>

        </section>
    `;
}


/* =========================================================
   COMPANY DIRECTORY
   ========================================================= */


function renderCompanies():
string {

    if (!clients) {
        return "";
    }


    if (
        clients.companies.length ===
        0
    ) {
        return `
            <div class="orders-empty">
                Все още няма създадени
                клиентски фирми.
            </div>
        `;
    }


    return clients.companies
        .map(
            company => {

                const sites =
                    clients?.sites.filter(
                        site =>
                            site.companyId ===
                            company.id
                    ) || [];


                const accounts =
                    clients?.accounts.filter(
                        account =>
                            account.companyId ===
                            company.id
                    ) || [];


                return `
                    <article
                        class="client-company-card"
                    >

                        <header
                            class="client-company-header"
                        >
                            <div>
                                <strong>
                                    🏢
                                    ${escapeHtml(
                                        company.companyName
                                    )}
                                </strong>

                                ${
                                    company.contactPerson
                                        ? `
                                            <span>
                                                👤
                                                ${escapeHtml(
                                                    company.contactPerson
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                                ${
                                    company.phone
                                        ? `
                                            <span>
                                                📞
                                                ${escapeHtml(
                                                    company.phone
                                                )}
                                            </span>
                                        `
                                        : ""
                                }
                            </div>

                            <span
                                class="client-active-badge"
                            >
                                ● Активна
                            </span>
                        </header>


                        <div
                            class="client-company-columns"
                        >

                            <div>
                                <h5>
                                    📍 Обекти
                                    (${sites.length})
                                </h5>

                                ${
                                    sites.length

                                        ? sites
                                            .map(
                                                site => `
                                                    <div
                                                        class="client-directory-item"
                                                    >
                                                        <strong>
                                                            ${escapeHtml(
                                                                site.siteName
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ${escapeHtml(
                                                                site.address
                                                            )}
                                                        </span>

                                                        ${
                                                            site.phone
                                                                ? `
                                                                    <small>
                                                                        📞
                                                                        ${escapeHtml(
                                                                            site.phone
                                                                        )}
                                                                    </small>
                                                                `
                                                                : ""
                                                        }
                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <div
                                                class="client-directory-empty"
                                            >
                                                Няма обекти
                                            </div>
                                        `
                                }
                            </div>


                            <div>
                                <h5>
                                    👤 Акаунти
                                    (${accounts.length})
                                </h5>

                                ${
                                    accounts.length

                                        ? accounts
                                            .map(
                                                account => `
                                                    <div
                                                        class="client-directory-item"
                                                    >
                                                        <strong>
                                                            ${escapeHtml(
                                                                account.displayName
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ID:
                                                            ${escapeHtml(
                                                                account.loginId
                                                            )}
                                                        </span>

                                                        ${
                                                            account.phone
                                                                ? `
                                                                    <small>
                                                                        📞
                                                                        ${escapeHtml(
                                                                            account.phone
                                                                        )}
                                                                    </small>
                                                                `
                                                                : ""
                                                        }
                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <div
                                                class="client-directory-empty"
                                            >
                                                Няма акаунти
                                            </div>
                                        `
                                }
                            </div>

                        </div>

                    </article>
                `;
            }
        )
        .join("");
}


/* =========================================================
   REFRESH
   ========================================================= */


async function refreshPage():
Promise<void> {

    const version =
        ++refreshVersion;


    setPageMessage(
        "",
        null
    );


    try {

        const [
            clientSnapshot,
            activeOrders
        ] =
            await Promise.all([
                loadClientManagementSnapshot(),
                loadAdminActiveOrders()
            ]);


        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        if (
            !getRoot()?.isConnected
        ) {
            return;
        }


        clients =
            clientSnapshot;

        orders =
            activeOrders;


        renderOrders();

        renderClientManagement();

    } catch (error) {

        if (
            version !==
            refreshVersion
        ) {
            return;
        }


        setPageMessage(
            errorMessage(error),
            "error"
        );
    }
}


/* =========================================================
   COMPANY CREATE
   ========================================================= */


async function submitCompany(
    form: HTMLFormElement
): Promise<void> {

    const name =
        form.querySelector<
            HTMLInputElement
        >("#k3CompanyName");

    const contact =
        form.querySelector<
            HTMLInputElement
        >("#k3CompanyContact");

    const phone =
        form.querySelector<
            HTMLInputElement
        >("#k3CompanyPhone");

    const email =
        form.querySelector<
            HTMLInputElement
        >("#k3CompanyEmail");

    const address =
        form.querySelector<
            HTMLInputElement
        >("#k3CompanyAddress");

    const button =
        form.querySelector<
            HTMLButtonElement
        >('[type="submit"]');


    if (
        !name ||
        !contact ||
        !phone ||
        !email ||
        !address ||
        !button
    ) {
        return;
    }


    button.disabled =
        true;


    try {

        await createClientCompany({
            companyName:
                name.value.trim(),

            contactPerson:
                contact.value.trim(),

            phone:
                phone.value.trim(),

            email:
                email.value.trim(),

            registeredAddress:
                address.value.trim()
        });


        form.reset();

        await refreshPage();

        setPageMessage(
            "Фирмата е създадена успешно.",
            "success"
        );

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


/* =========================================================
   SITE CREATE
   ========================================================= */


function optionalCoordinate(
    input: HTMLInputElement
): number | null {

    const value =
        input.value.trim();

    if (!value) {
        return null;
    }


    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


async function submitSite(
    form: HTMLFormElement
): Promise<void> {

    const company =
        form.querySelector<
            HTMLSelectElement
        >("#k3SiteCompany");

    const name =
        form.querySelector<
            HTMLInputElement
        >("#k3SiteName");

    const address =
        form.querySelector<
            HTMLInputElement
        >("#k3SiteAddress");

    const contact =
        form.querySelector<
            HTMLInputElement
        >("#k3SiteContact");

    const phone =
        form.querySelector<
            HTMLInputElement
        >("#k3SitePhone");

    const latitude =
        form.querySelector<
            HTMLInputElement
        >("#k3SiteLatitude");

    const longitude =
        form.querySelector<
            HTMLInputElement
        >("#k3SiteLongitude");

    const button =
        form.querySelector<
            HTMLButtonElement
        >('[type="submit"]');


    if (
        !company ||
        !name ||
        !address ||
        !contact ||
        !phone ||
        !latitude ||
        !longitude ||
        !button
    ) {
        return;
    }


    const lat =
        optionalCoordinate(
            latitude
        );

    const lng =
        optionalCoordinate(
            longitude
        );


    if (
        (lat === null) !==
        (lng === null)
    ) {
        setPageMessage(
            "Ако въвеждаш координати, трябва да попълниш и Latitude, и Longitude.",
            "error"
        );

        return;
    }


    button.disabled =
        true;


    try {

        await createClientSite({
            companyId:
                company.value,

            siteName:
                name.value.trim(),

            address:
                address.value.trim(),

            contactPerson:
                contact.value.trim(),

            phone:
                phone.value.trim(),

            latitude:
                lat,

            longitude:
                lng
        });


        form.reset();

        await refreshPage();

        setPageMessage(
            "Обектът е създаден успешно.",
            "success"
        );

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


/* =========================================================
   CLIENT ACCOUNT CREATE
   ========================================================= */


async function submitClient(
    form: HTMLFormElement
): Promise<void> {

    const company =
        form.querySelector<
            HTMLSelectElement
        >("#k3ClientCompany");

    const name =
        form.querySelector<
            HTMLInputElement
        >("#k3ClientName");

    const phone =
        form.querySelector<
            HTMLInputElement
        >("#k3ClientPhone");

    const login =
        form.querySelector<
            HTMLInputElement
        >("#k3ClientLogin");

    const password =
        form.querySelector<
            HTMLInputElement
        >("#k3ClientPassword");

    const button =
        form.querySelector<
            HTMLButtonElement
        >('[type="submit"]');


    if (
        !company ||
        !name ||
        !phone ||
        !login ||
        !password ||
        !button
    ) {
        return;
    }


    button.disabled =
        true;


    try {

        await createClientAccount({
            companyId:
                company.value,

            displayName:
                name.value.trim(),

            phone:
                phone.value.trim(),

            loginId:
                login.value
                    .trim()
                    .toLowerCase(),

            password:
                password.value
        });


        form.reset();

        password.type =
            "password";


        await refreshPage();

        setPageMessage(
            "Клиентският акаунт е създаден успешно.",
            "success"
        );

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


    event.preventDefault();


    if (
        form.id ===
        "k3CreateCompanyForm"
    ) {
        await submitCompany(form);
        return;
    }


    if (
        form.id ===
        "k3CreateSiteForm"
    ) {
        await submitSite(form);
        return;
    }


    if (
        form.id ===
        "k3CreateClientForm"
    ) {
        await submitClient(form);
    }
}


function handleClick(
    event: Event
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
            "[data-orders-action]"
        );


    if (
        !button ||
        button.dataset.ordersAction !==
            "toggle-client-password"
    ) {
        return;
    }


    const password =
        document.querySelector<
            HTMLInputElement
        >(
            "#k3ClientPassword"
        );


    if (!password) {
        return;
    }


    const show =
        password.type ===
        "password";


    password.type =
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
            void handleSubmit(
                event
            );
        }
    );


    root.addEventListener(
        "click",
        handleClick
    );


    await refreshPage();
}
