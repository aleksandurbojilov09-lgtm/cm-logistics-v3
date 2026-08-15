const NON_EDITING_INPUT_TYPES =
    new Set([
        "button",
        "submit",
        "reset",
        "checkbox",
        "radio",
        "range",
        "color",
        "file",
        "hidden",
        "image"
    ]);


export function isUserEditing():
boolean {

    const active =
        document.activeElement;


    if (
        !(active instanceof HTMLElement)
    ) {
        return false;
    }


    if (active.isContentEditable) {
        return true;
    }


    if (
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
    ) {
        return !active.disabled;
    }


    if (
        active instanceof HTMLInputElement
    ) {

        if (
            active.disabled ||
            active.readOnly
        ) {
            return false;
        }


        return !NON_EDITING_INPUT_TYPES.has(
            active.type
        );
    }


    return false;
}
