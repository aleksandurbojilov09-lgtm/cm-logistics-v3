import {
    supabase
} from "../../shared/api/supabase";

export async function logoutCurrentSession():
    Promise<void> {
    const {
        error
    } = await supabase.auth.signOut({
        scope: "local"
    });

    if (error) {
        throw new Error(
            "K3 Logistics: unable to sign out."
        );
    }
}
