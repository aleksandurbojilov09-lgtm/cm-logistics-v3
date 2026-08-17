import {
    initializeOperationsPage,
    renderOperationsPage
} from "../admin/admin-page";


export function renderPage():
string {

    return renderOperationsPage(
        "dispatcher"
    );
}


export async function initializePage():
Promise<void> {

    await initializeOperationsPage(
        "dispatcher"
    );
}
