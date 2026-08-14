const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
    throw new Error("CM Logistics: #app root element was not found.");
}

app.innerHTML = `
    <main>
        <h1>CM Logistics V3</h1>
        <p>Application initialized successfully.</p>
    </main>
`;
