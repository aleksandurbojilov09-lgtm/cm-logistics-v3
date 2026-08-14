import "./styles.css";
import { renderLoginPage } from "../pages/login/login-page";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
    throw new Error("CM Logistics: #app root element was not found.");
}

app.innerHTML = renderLoginPage();
