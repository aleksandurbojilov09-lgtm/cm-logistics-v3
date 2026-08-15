import {
    supabase
} from "../../shared/api/supabase";

import {
    FIXED_LOCATION_CODES,
    type FixedLocation,
    type FixedLocationCode
} from "./fixed-location";


const REQUIRED_CODES:
FixedLocationCode[] = [
    FIXED_LOCATION_CODES.TRUCK_BASE,
    FIXED_LOCATION_CODES.BIOEXIS
];


function isRecord(
    value: unknown
): value is Record<string, unknown> {

    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}


function parseCode(
    value: unknown
): FixedLocationCode | null {

    if (
        value ===
            FIXED_LOCATION_CODES.BIOEXIS ||
        value ===
            FIXED_LOCATION_CODES.TRUCK_BASE
    ) {
        return value;
    }


    return null;
}


function mapFixedLocation(
    value: unknown
): FixedLocation {

    if (!isRecord(value)) {
        throw new Error(
            "Получени са невалидни данни за системна локация."
        );
    }


    const id =
        typeof value.id === "string"
            ? value.id
            : "";

    const code =
        parseCode(
            value.code
        );

    const name =
        typeof value.name === "string"
            ? value.name.trim()
            : "";

    const address =
        typeof value.address === "string"
            ? value.address
            : null;

    const latitude =
        typeof value.latitude === "number"
            ? value.latitude
            : Number.NaN;

    const longitude =
        typeof value.longitude === "number"
            ? value.longitude
            : Number.NaN;


    if (
        !id ||
        !code ||
        !name ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error(
            "Получени са невалидни данни за системна локация."
        );
    }


    return {
        id,
        code,
        name,
        address,
        latitude,
        longitude
    };
}


export async function
loadFixedLocations():
Promise<FixedLocation[]> {

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
            .in(
                "code",
                REQUIRED_CODES
            )
            .eq(
                "is_active",
                true
            );


    if (error) {
        throw new Error(
            error.message ||
            "Системните локации не можаха да бъдат заредени."
        );
    }


    if (!Array.isArray(data)) {
        throw new Error(
            "Системните локации не можаха да бъдат заредени."
        );
    }


    const locations =
        data.map(
            mapFixedLocation
        );


    for (
        const code
        of REQUIRED_CODES
    ) {

        if (
            !locations.some(
                location =>
                    location.code === code
            )
        ) {
            throw new Error(
                `Липсва системна локация ${code}.`
            );
        }
    }


    return locations;
}


export function
findFixedLocation(
    locations:
        FixedLocation[],

    code:
        FixedLocationCode
): FixedLocation | null {

    return (
        locations.find(
            location =>
                location.code === code
        ) ||
        null
    );
}
