import {
    supabase
} from "../../shared/api/supabase";

import {
    FIXED_LOCATION_CODES,
    type FixedLocation
} from "../../entities/location/fixed-location";


function isRecord(
    value: unknown
): value is Record<string, unknown> {

    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}


function mapFixedLocation(
    value: unknown
): FixedLocation {

    if (!isRecord(value)) {
        throw new Error(
            "BIOEXIS има невалидни данни."
        );
    }


    const id =
        typeof value.id === "string"
            ? value.id
            : "";

    const code =
        typeof value.code === "string"
            ? value.code
            : "";

    const name =
        typeof value.name === "string"
            ? value.name
            : "";

    const address =
        typeof value.address === "string"
            ? value.address
            : null;

    const latitude =
        Number(
            value.latitude
        );

    const longitude =
        Number(
            value.longitude
        );


    if (
        !id ||
        code !==
            FIXED_LOCATION_CODES.BIOEXIS ||
        !name ||
        !Number.isFinite(
            latitude
        ) ||
        !Number.isFinite(
            longitude
        )
    ) {
        throw new Error(
            "BIOEXIS има невалидни данни."
        );
    }


    return {
        id,

        code:
            FIXED_LOCATION_CODES.BIOEXIS,

        name,

        address,

        latitude,

        longitude
    };
}


export async function
loadTripDestination():
Promise<FixedLocation> {

    const {
        data,
        error
    } =
        await supabase
            .from(
                "fixed_locations"
            )
            .select(
                [
                    "id",
                    "code",
                    "name",
                    "address",
                    "latitude",
                    "longitude"
                ].join(",")
            )
            .eq(
                "code",
                FIXED_LOCATION_CODES.BIOEXIS
            )
            .eq(
                "is_active",
                true
            )
            .maybeSingle();


    if (error) {
        throw new Error(
            error.message ||
            "BIOEXIS не можа да бъде зареден."
        );
    }


    if (!data) {
        throw new Error(
            "BIOEXIS не е конфигуриран."
        );
    }


    return mapFixedLocation(
        data
    );
}
