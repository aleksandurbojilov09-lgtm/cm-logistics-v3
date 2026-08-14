import "./styles.css";

import {
    initializeLoginPage,
    renderLoginPage
} from "../pages/login/login-page";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
    throw new Error("K3 Logistics: #app root element was not found.");
}

app.innerHTML = renderLoginPage();

initializeLoginPage();
