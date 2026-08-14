export function buildGoogleMapsNavigationUrl(
    latitude: number,
    longitude: number
): string | null {

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }


    const url =
        new URL(
            "https://www.google.com/maps/dir/"
        );


    url.searchParams.set(
        "api",
        "1"
    );


    url.searchParams.set(
        "destination",
        `${latitude},${longitude}`
    );


    url.searchParams.set(
        "travelmode",
        "driving"
    );


    url.searchParams.set(
        "dir_action",
        "navigate"
    );


    return url.toString();
}
