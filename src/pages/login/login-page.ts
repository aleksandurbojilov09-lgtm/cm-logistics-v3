import "./login-page.css";

import {
    login
} from "../../features/auth/login";

import {
    requestPasswordReset
} from "../../features/auth/request-password-reset";

import {
    submitClientRegistration
} from "../../features/clients/client-registration-service";

import {
    normalizeLoginId
} from "../../shared/lib/auth-login-id";

import {
    loadLeaflet,
    type LeafletLatLng,
    type LeafletMap,
    type LeafletMarker
} from "../../shared/lib/leaflet-loader";

import {
    getRememberedLoginId
} from "../../shared/lib/login-preferences";


const DEFAULT_MAP_CENTER: [
    number,
    number
] = [
    42.6977,
    23.3219
];


const REGISTRATION_SUCCESS_MESSAGE =
    "Заявката за регистрация е изпратена. Изчакайте одобрение от администратор.";


let registrationMap:
    LeafletMap | null =
    null;


let registrationMarker:
    LeafletMarker | null =
    null;


let registrationLatitude:
    number | null =
    null;


let registrationLongitude:
    number | null =
    null;


let mapLoadVersion =
    0;


let reverseGeocodeTimer:
    number | null =
    null;


let reverseGeocodeVersion =
    0;


const reverseGeocodeCache =
    new Map<string, string>();


export function renderLoginPage(): string {
    return `
        <main class="login-page">
            <div class="login-container">

                <header class="login-brand">
                    <div
                        class="login-brand-icon"
                        aria-hidden="true"
                    >
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
                                x="180"
                                y="110"
                                text-anchor="middle"
                                dominant-baseline="central"
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

                    <div
                        class="login-tabs"
                        role="tablist"
                        aria-label="Достъп до системата"
                    >
                        <button
                            id="loginTab"
                            class="login-tab login-tab-active"
                            type="button"
                            role="tab"
                            aria-controls="loginSection"
                            aria-selected="true"
                        >
                            🔑 Вход
                        </button>

                        <button
                            id="registerTab"
                            class="login-tab"
                            type="button"
                            role="tab"
                            aria-controls="registerSection"
                            aria-selected="false"
                        >
                            🏢 Регистрация на фирма
                        </button>
                    </div>

                    <section
                        id="loginSection"
                        class="login-section"
                        role="tabpanel"
                        aria-labelledby="loginTab"
                    >
                        <div class="login-form-container">

                            <h2>Вход в системата</h2>

                            <p class="login-description">
                                За администратор, диспечери, шофьори и одобрени клиенти
                            </p>

                            <form
                                id="loginForm"
                                class="login-form"
                                autocomplete="on"
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

                                <button
                                    id="forgotPasswordButton"
                                    class="forgot-password-link"
                                    type="button"
                                >
                                    Забравена парола?
                                </button>
                            </form>

                        </div>
                    </section>

                    <section
                        id="registerSection"
                        class="login-section"
                        role="tabpanel"
                        aria-labelledby="registerTab"
                        hidden
                    >
                        <div class="registration-form-container">

                            <h2>Регистрация на клиентска фирма</h2>

                            <p class="login-description">
                                Попълнете данните и изберете точната позиция за товарене. Достъпът се активира след одобрение от администратор.
                            </p>

                            <form
                                id="registrationForm"
                                class="registration-form"
                                autocomplete="on"
                            >
                                <div class="registration-grid">
                                    <div class="login-field">
                                        <label for="registrationCompanyName">
                                            Име на фирмата
                                        </label>

                                        <input
                                            id="registrationCompanyName"
                                            type="text"
                                            maxlength="160"
                                            required
                                        />
                                    </div>

                                    <div class="login-field">
                                        <label for="registrationContactPerson">
                                            Лице за контакт
                                        </label>

                                        <input
                                            id="registrationContactPerson"
                                            type="text"
                                            autocomplete="name"
                                            maxlength="120"
                                            required
                                        />
                                    </div>

                                    <div class="login-field">
                                        <label for="registrationPhone">
                                            Телефон
                                        </label>

                                        <input
                                            id="registrationPhone"
                                            type="tel"
                                            autocomplete="tel"
                                            maxlength="40"
                                            required
                                        />
                                    </div>

                                    <div class="login-field">
                                        <label for="registrationLoginId">
                                            Потребителско ID
                                        </label>

                                        <input
                                            id="registrationLoginId"
                                            type="text"
                                            autocomplete="username"
                                            minlength="3"
                                            maxlength="32"
                                            pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                                            autocapitalize="none"
                                            spellcheck="false"
                                            required
                                        />
                                    </div>

                                    <div class="login-field">
                                        <label for="registrationPassword">
                                            Парола
                                        </label>

                                        <input
                                            id="registrationPassword"
                                            type="password"
                                            autocomplete="new-password"
                                            minlength="8"
                                            required
                                        />
                                    </div>

                                    <div class="login-field">
                                        <label for="registrationPasswordConfirm">
                                            Потвърди паролата
                                        </label>

                                        <input
                                            id="registrationPasswordConfirm"
                                            type="password"
                                            autocomplete="new-password"
                                            minlength="8"
                                            required
                                        />
                                    </div>
                                </div>

                                <div class="login-field">
                                    <label for="registrationLoadingAddress">
                                        Адрес за товарене
                                    </label>

                                    <input
                                        id="registrationLoadingAddress"
                                        type="text"
                                        autocomplete="street-address"
                                        maxlength="250"
                                        required
                                    />
                                </div>

                                <div class="registration-map-field">
                                    <div class="registration-map-heading">
                                        <div>
                                            <strong>Точна позиция за товарене</strong>
                                            <span>Кликнете върху картата или преместете маркера.</span>
                                        </div>
                                    </div>

                                    <div
                                        id="registrationMap"
                                        class="registration-map"
                                        aria-label="Карта за избор на позиция за товарене"
                                    >
                                        <div class="registration-map-loading">
                                            Картата ще се зареди при отваряне на регистрацията.
                                        </div>
                                    </div>

                                    <div class="registration-coordinates">
                                        <label>
                                            Latitude

                                            <input
                                                id="registrationLatitude"
                                                type="text"
                                                readonly
                                                tabindex="-1"
                                            />
                                        </label>

                                        <label>
                                            Longitude

                                            <input
                                                id="registrationLongitude"
                                                type="text"
                                                readonly
                                                tabindex="-1"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div
                                    id="registrationMessage"
                                    class="registration-message"
                                    aria-live="polite"
                                ></div>

                                <button
                                    id="registrationButton"
                                    class="login-button"
                                    type="submit"
                                >
                                    🏢 Изпрати заявка
                                </button>
                            </form>

                        </div>
                    </section>

                </div>

                <div
                    id="passwordResetModal"
                    class="password-reset-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="passwordResetTitle"
                    aria-describedby="passwordResetDescription"
                    hidden
                >
                    <button
                        class="password-reset-backdrop"
                        type="button"
                        data-password-reset-close
                        aria-label="Затвори прозореца"
                    ></button>

                    <section class="password-reset-dialog">
                        <header class="password-reset-header">
                            <div>
                                <h2 id="passwordResetTitle">
                                    Забравена парола
                                </h2>

                                <p
                                    id="passwordResetDescription"
                                    class="password-reset-description"
                                >
                                    Въведете само потребителското си ID. Администратор или диспечер ще провери заявката и ще се свърже с вас на записания телефон.
                                </p>
                            </div>

                            <button
                                class="password-reset-close"
                                type="button"
                                data-password-reset-close
                                aria-label="Затвори"
                            >
                                ×
                            </button>
                        </header>

                        <form
                            id="passwordResetForm"
                            class="password-reset-form"
                            autocomplete="off"
                        >
                            <div class="login-field">
                                <label for="passwordResetLoginId">
                                    Потребителско ID
                                </label>

                                <input
                                    id="passwordResetLoginId"
                                    name="username"
                                    type="text"
                                    autocomplete="username"
                                    placeholder="Въведете ID"
                                    minlength="3"
                                    maxlength="32"
                                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                                    autocapitalize="none"
                                    spellcheck="false"
                                    required
                                />
                            </div>

                            <div
                                id="passwordResetMessage"
                                class="password-reset-message"
                                aria-live="polite"
                            ></div>

                            <button
                                id="passwordResetSubmitButton"
                                class="login-button"
                                type="submit"
                            >
                                Изпрати заявка
                            </button>
                        </form>
                    </section>
                </div>

            </div>
        </main>
    `;
}


function setMessage(
    element: HTMLElement,
    message: string,
    status: "success" | "error" | null
): void {
    element.textContent =
        message;

    if (status) {
        element.dataset.status =
            status;
    } else {
        delete element.dataset.status;
    }
}


function updateCoordinateInputs():
void {
    const latitudeInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#registrationLatitude"
        );

    const longitudeInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#registrationLongitude"
        );


    if (latitudeInput) {
        latitudeInput.value =
            registrationLatitude ===
                null
                ? ""
                : registrationLatitude
                    .toFixed(6);
    }

    if (longitudeInput) {
        longitudeInput.value =
            registrationLongitude ===
                null
                ? ""
                : registrationLongitude
                    .toFixed(6);
    }
}


function setRegistrationCoordinates(
    coordinates: LeafletLatLng
): void {
    registrationLatitude =
        coordinates.lat;

    registrationLongitude =
        coordinates.lng;

    updateCoordinateInputs();
}


function getRegistrationAddressInput():
HTMLInputElement | null {
    return document.querySelector<HTMLInputElement>(
        "#registrationLoadingAddress"
    );
}


function scheduleRegistrationAddressLookup(
    coordinates: LeafletLatLng
): void {
    if (reverseGeocodeTimer !== null) {
        window.clearTimeout(
            reverseGeocodeTimer
        );
    }

    const cacheKey =
        `${coordinates.lat.toFixed(5)},${coordinates.lng.toFixed(5)}`;

    const cachedAddress =
        reverseGeocodeCache.get(
            cacheKey
        );

    if (cachedAddress) {
        const addressInput =
            getRegistrationAddressInput();

        if (addressInput) {
            addressInput.value =
                cachedAddress;
        }

        return;
    }

    const requestVersion =
        ++reverseGeocodeVersion;

    reverseGeocodeTimer =
        window.setTimeout(
            () => {
                reverseGeocodeTimer =
                    null;

                void reverseGeocodeRegistrationAddress(
                    coordinates,
                    cacheKey,
                    requestVersion
                );
            },
            1100
        );
}


async function reverseGeocodeRegistrationAddress(
    coordinates: LeafletLatLng,
    cacheKey: string,
    requestVersion: number
): Promise<void> {
    try {
        const parameters =
            new URLSearchParams({
                format: "jsonv2",
                lat: String(
                    coordinates.lat
                ),
                lon: String(
                    coordinates.lng
                ),
                zoom: "18",
                addressdetails: "1",
                "accept-language": "bg"
            });

        const response =
            await fetch(
                `https://nominatim.openstreetmap.org/reverse?${parameters.toString()}`,
                {
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const result:
            unknown =
            await response.json();

        if (
            requestVersion !==
                reverseGeocodeVersion ||
            typeof result !== "object" ||
            result === null ||
            !(
                "display_name" in
                result
            ) ||
            typeof result.display_name !==
                "string"
        ) {
            return;
        }

        const address =
            result.display_name
                .trim()
                .slice(
                    0,
                    250
                );

        if (!address) {
            return;
        }

        reverseGeocodeCache.set(
            cacheKey,
            address
        );

        const addressInput =
            getRegistrationAddressInput();

        if (addressInput) {
            addressInput.value =
                address;
        }
    } catch {
        // Address may still be entered manually.
    }
}


function disposeRegistrationMap():
void {
    mapLoadVersion += 1;
    reverseGeocodeVersion += 1;

    if (reverseGeocodeTimer !== null) {
        window.clearTimeout(
            reverseGeocodeTimer
        );

        reverseGeocodeTimer =
            null;
    }

    registrationMap?.remove();

    registrationMap =
        null;

    registrationMarker =
        null;

    registrationLatitude =
        null;

    registrationLongitude =
        null;

    updateCoordinateInputs();


    const mapElement =
        document.querySelector<
            HTMLElement
        >(
            "#registrationMap"
        );


    if (mapElement) {
        mapElement.innerHTML = `
            <div class="registration-map-loading">
                Зареждане на картата...
            </div>
        `;
    }
}


async function initializeRegistrationMap(
    messageElement: HTMLElement
): Promise<void> {
    if (registrationMap) {
        registrationMap.invalidateSize();
        return;
    }


    const mapElement =
        document.querySelector<
            HTMLElement
        >(
            "#registrationMap"
        );


    if (!mapElement) {
        return;
    }


    const currentLoad =
        ++mapLoadVersion;


    mapElement.innerHTML = `
        <div class="registration-map-loading">
            Зареждане на картата...
        </div>
    `;


    try {
        const leaflet =
            await loadLeaflet();


        if (
            currentLoad !==
                mapLoadVersion ||
            !mapElement.isConnected
        ) {
            return;
        }


        mapElement.innerHTML = "";


        const map =
            leaflet
                .map(mapElement)
                .setView(
                    DEFAULT_MAP_CENTER,
                    7
                );


        leaflet
            .tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution:
                        "&copy; OpenStreetMap contributors"
                }
            )
            .addTo(map);


        map.on(
            "click",
            event => {
                if (registrationMarker) {
                    registrationMarker
                        .setLatLng(
                            event.latlng
                        );
                } else {
                    registrationMarker =
                        leaflet
                            .marker(
                                [
                                    event.latlng.lat,
                                    event.latlng.lng
                                ],
                                {
                                    draggable: true,
                                    title:
                                        "Позиция за товарене",
                                    alt:
                                        "Позиция за товарене"
                                }
                            )
                            .addTo(map)
                            .on(
                                "dragend",
                                () => {
                                    if (
                                        registrationMarker
                                    ) {
                                        const markerCoordinates =
                                            registrationMarker
                                                .getLatLng();

                                        setRegistrationCoordinates(
                                            markerCoordinates
                                        );

                                        scheduleRegistrationAddressLookup(
                                            markerCoordinates
                                        );
                                    }
                                }
                            );
                }


                setRegistrationCoordinates(
                    event.latlng
                );

                scheduleRegistrationAddressLookup(
                    event.latlng
                );

                setMessage(
                    messageElement,
                    "",
                    null
                );
            }
        );


        registrationMap =
            map;


        window.setTimeout(
            () => {
                registrationMap
                    ?.invalidateSize();
            },
            0
        );
    } catch {
        mapElement.innerHTML = `
            <div class="registration-map-error">
                Картата не можа да бъде заредена.
            </div>
        `;

        setMessage(
            messageElement,
            "Картата не можа да бъде заредена. Опитайте отново.",
            "error"
        );
    }
}


export function initializeLoginPage(): void {
    const form =
        document.querySelector<
            HTMLFormElement
        >(
            "#loginForm"
        );

    const usernameInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#loginUsername"
        );

    const passwordInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#loginPassword"
        );

    const rememberMeInput =
        document.querySelector<
            HTMLInputElement
        >(
            "#rememberMe"
        );

    const loginButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#loginButton"
        );

    const loginMessage =
        document.querySelector<
            HTMLDivElement
        >(
            "#loginMessage"
        );

    const forgotPasswordButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#forgotPasswordButton"
        );

    const passwordResetModal =
        document.querySelector<
            HTMLDivElement
        >(
            "#passwordResetModal"
        );

    const passwordResetForm =
        document.querySelector<
            HTMLFormElement
        >(
            "#passwordResetForm"
        );

    const passwordResetLoginId =
        document.querySelector<
            HTMLInputElement
        >(
            "#passwordResetLoginId"
        );

    const passwordResetMessage =
        document.querySelector<
            HTMLDivElement
        >(
            "#passwordResetMessage"
        );

    const passwordResetSubmitButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#passwordResetSubmitButton"
        );

    const loginTab =
        document.querySelector<
            HTMLButtonElement
        >(
            "#loginTab"
        );

    const registerTab =
        document.querySelector<
            HTMLButtonElement
        >(
            "#registerTab"
        );

    const loginSection =
        document.querySelector<
            HTMLElement
        >(
            "#loginSection"
        );

    const registerSection =
        document.querySelector<
            HTMLElement
        >(
            "#registerSection"
        );

    const registrationForm =
        document.querySelector<
            HTMLFormElement
        >(
            "#registrationForm"
        );

    const registrationMessage =
        document.querySelector<
            HTMLDivElement
        >(
            "#registrationMessage"
        );

    const registrationButton =
        document.querySelector<
            HTMLButtonElement
        >(
            "#registrationButton"
        );


    if (
        !form ||
        !usernameInput ||
        !passwordInput ||
        !rememberMeInput ||
        !loginButton ||
        !loginMessage ||
        !forgotPasswordButton ||
        !passwordResetModal ||
        !passwordResetForm ||
        !passwordResetLoginId ||
        !passwordResetMessage ||
        !passwordResetSubmitButton ||
        !loginTab ||
        !registerTab ||
        !loginSection ||
        !registerSection ||
        !registrationForm ||
        !registrationMessage ||
        !registrationButton
    ) {
        return;
    }


    disposeRegistrationMap();


    const closePasswordResetModal =
        (): void => {
            passwordResetModal.hidden =
                true;

            document.body.classList.remove(
                "password-reset-modal-open"
            );

            forgotPasswordButton.focus();
        };


    const openPasswordResetModal =
        (): void => {
            passwordResetForm.reset();

            passwordResetLoginId.value =
                normalizeLoginId(
                    usernameInput.value
                );

            setMessage(
                passwordResetMessage,
                "",
                null
            );

            passwordResetSubmitButton.disabled =
                false;

            passwordResetSubmitButton.textContent =
                "Изпрати заявка";

            passwordResetModal.hidden =
                false;

            document.body.classList.add(
                "password-reset-modal-open"
            );

            window.setTimeout(
                () => {
                    passwordResetLoginId.focus();
                    passwordResetLoginId.select();
                },
                0
            );
        };


    const showTab = (
        tab: "login" | "register"
    ): void => {
        const showLogin =
            tab === "login";


        loginSection.hidden =
            !showLogin;

        registerSection.hidden =
            showLogin;

        loginTab.classList.toggle(
            "login-tab-active",
            showLogin
        );

        registerTab.classList.toggle(
            "login-tab-active",
            !showLogin
        );

        loginTab.setAttribute(
            "aria-selected",
            String(showLogin)
        );

        registerTab.setAttribute(
            "aria-selected",
            String(!showLogin)
        );


        if (showLogin) {
            usernameInput.focus();
        } else {
            void initializeRegistrationMap(
                registrationMessage
            );
        }
    };


    loginTab.addEventListener(
        "click",
        () => showTab("login")
    );

    registerTab.addEventListener(
        "click",
        () => showTab("register")
    );


    forgotPasswordButton.addEventListener(
        "click",
        openPasswordResetModal
    );

    passwordResetModal.addEventListener(
        "click",
        event => {
            const target =
                event.target;

            if (
                target instanceof
                    HTMLElement &&
                target.closest(
                    "[data-password-reset-close]"
                )
            ) {
                closePasswordResetModal();
            }
        }
    );

    passwordResetModal.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                event.preventDefault();
                closePasswordResetModal();
            }
        }
    );


    const rememberedLoginId =
        getRememberedLoginId();

    if (rememberedLoginId) {
        usernameInput.value =
            rememberedLoginId;

        rememberMeInput.checked =
            true;
    }


    form.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            setMessage(
                loginMessage,
                "",
                null
            );

            loginButton.disabled =
                true;

            loginButton.textContent =
                "Влизане...";


            try {
                const result =
                    await login({
                        loginId:
                            usernameInput.value,

                        password:
                            passwordInput.value,

                        rememberMe:
                            rememberMeInput.checked
                    });


                if (!result.success) {
                    setMessage(
                        loginMessage,
                        result.message,
                        "error"
                    );
                }
            } catch {
                setMessage(
                    loginMessage,
                    "Възникна грешка при вход. Опитайте отново.",
                    "error"
                );
            } finally {
                loginButton.disabled =
                    false;

                loginButton.textContent =
                    "🔑 Вход";
            }
        }
    );


    passwordResetForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            setMessage(
                passwordResetMessage,
                "",
                null
            );

            passwordResetSubmitButton.disabled =
                true;

            passwordResetSubmitButton.textContent =
                "Изпращане...";


            let requestSucceeded =
                false;


            try {
                const message =
                    await requestPasswordReset(
                        passwordResetLoginId.value
                    );

                requestSucceeded =
                    true;

                setMessage(
                    passwordResetMessage,
                    message,
                    "success"
                );
            } catch (error) {
                setMessage(
                    passwordResetMessage,
                    error instanceof Error &&
                    error.message
                        ? error.message
                        : "Заявката не можа да бъде изпратена. Опитайте отново.",
                    "error"
                );
            } finally {
                passwordResetSubmitButton.disabled =
                    requestSucceeded;

                passwordResetSubmitButton.textContent =
                    requestSucceeded
                        ? "Заявката е изпратена"
                        : "Изпрати заявка";
            }
        }
    );


    registrationForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();


            const companyName =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationCompanyName"
                    );

            const contactPerson =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationContactPerson"
                    );

            const phone =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationPhone"
                    );

            const loginIdInput =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationLoginId"
                    );

            const registrationPassword =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationPassword"
                    );

            const passwordConfirm =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationPasswordConfirm"
                    );

            const loadingAddress =
                registrationForm
                    .querySelector<
                        HTMLInputElement
                    >(
                        "#registrationLoadingAddress"
                    );


            if (
                !companyName ||
                !contactPerson ||
                !phone ||
                !loginIdInput ||
                !registrationPassword ||
                !passwordConfirm ||
                !loadingAddress
            ) {
                return;
            }


            const normalizedLoginId =
                normalizeLoginId(
                    loginIdInput.value
                );


            if (
                !/^[a-z0-9][a-z0-9._-]{2,31}$/
                    .test(normalizedLoginId)
            ) {
                setMessage(
                    registrationMessage,
                    "ID-то трябва да е 3–32 символа и може да съдържа латински букви, цифри, точка, тире и долна черта.",
                    "error"
                );

                loginIdInput.focus();
                return;
            }


            if (
                registrationPassword
                    .value.length < 8
            ) {
                setMessage(
                    registrationMessage,
                    "Паролата трябва да бъде поне 8 символа.",
                    "error"
                );

                registrationPassword.focus();
                return;
            }


            if (
                registrationPassword.value !==
                    passwordConfirm.value
            ) {
                setMessage(
                    registrationMessage,
                    "Паролите не съвпадат.",
                    "error"
                );

                passwordConfirm.focus();
                return;
            }


            if (
                registrationLatitude ===
                    null ||
                registrationLongitude ===
                    null
            ) {
                setMessage(
                    registrationMessage,
                    "Изберете точната позиция за товарене на картата.",
                    "error"
                );

                return;
            }


            setMessage(
                registrationMessage,
                "",
                null
            );

            registrationButton.disabled =
                true;

            registrationButton.textContent =
                "Изпращане...";


            try {
                await submitClientRegistration({
                    companyName:
                        companyName.value
                            .trim(),

                    contactPerson:
                        contactPerson.value
                            .trim(),

                    phone:
                        phone.value.trim(),

                    loginId:
                        normalizedLoginId,

                    password:
                        registrationPassword
                            .value,

                    loadingAddress:
                        loadingAddress.value
                            .trim(),

                    latitude:
                        registrationLatitude,

                    longitude:
                        registrationLongitude
                });


                registrationForm.reset();

                disposeRegistrationMap();

                usernameInput.value =
                    normalizedLoginId;

                showTab("login");

                setMessage(
                    loginMessage,
                    REGISTRATION_SUCCESS_MESSAGE,
                    "success"
                );
            } catch (error) {
                setMessage(
                    registrationMessage,
                    error instanceof Error &&
                    error.message
                        ? error.message
                        : "Заявката за регистрация не можа да бъде изпратена.",
                    "error"
                );
            } finally {
                registrationButton.disabled =
                    false;

                registrationButton.textContent =
                    "🏢 Изпрати заявка";
            }
        }
    );
}
