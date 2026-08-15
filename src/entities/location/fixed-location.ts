export const FIXED_LOCATION_CODES = {
    BIOEXIS:
        "BIOEXIS",

    TRUCK_BASE:
        "TRUCK_BASE"
} as const;


export type FixedLocationCode =
    typeof FIXED_LOCATION_CODES[
        keyof typeof FIXED_LOCATION_CODES
    ];


export type FixedLocation = {
    id: string;
    code: FixedLocationCode;
    name: string;
    address: string | null;

    latitude: number;
    longitude: number;
};
