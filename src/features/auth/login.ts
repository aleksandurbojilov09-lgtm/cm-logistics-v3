import { supabase } from "../../shared/api/supabase";

import {
    loginIdToAuthEmail,
    normalizeLoginId
} from "../../shared/lib/auth-login-id";

import {
    clearRememberedLoginId,
    saveRememberedLoginId
} from "../../shared/lib/login-preferences";

import {
    getCurrentUserRole
} from "./get-current-role";

type LoginInput = {
    loginId: string;
    password: string;
    rememberMe: boolean;
};

type LoginResult =
    | {
        success: true;
    }
    | {
        success: false;
        message: string;
    };

export async function login(
    input: LoginInput
): Promise<LoginResult> {
    const loginId =
        normalizeLoginId(input.loginId);

    if (!loginId) {
        return {
            success: false,
            message: "Въведете потребителско ID."
        };
    }

    if (!input.password) {
        return {
            success: false,
            message: "Въведете парола."
        };
    }

    const email =
        loginId.includes("@")
            ? loginId
            : loginIdToAuthEmail(loginId);

    const {
        error
    } = await supabase.auth.signInWithPassword({
        email,
        password: input.password
    });

    if (error) {
        return {
            success: false,
            message:
                "Невалидно потребителско ID или парола."
        };
    }


    let role;


    try {
        role =
            await getCurrentUserRole();
    } catch {
        await supabase.auth.signOut({
            scope: "local"
        });

        return {
            success: false,
            message:
                "Достъпът не можа да бъде проверен. Опитайте отново."
        };
    }


    if (!role) {
        await supabase.auth.signOut({
            scope: "local"
        });

        return {
            success: false,
            message:
                "Акаунтът още няма активен достъп. Ако сте нов клиент, изчакайте одобрение."
        };
    }

    if (input.rememberMe) {
        saveRememberedLoginId(loginId);
    } else {
        clearRememberedLoginId();
    }

    return {
        success: true
    };
}
