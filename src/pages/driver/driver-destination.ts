import "../../../styles/pages/driver-destination.css";

import {
    FIXED_LOCATION_CODES,
    type FixedLocation
} from "../../entities/location/fixed-location";

import {
    escapeHtml
} from "../../shared/lib/html";

import {
    buildGoogleMapsNavigationUrl
} from "../../shared/lib/google-maps";

import type {
    LeafletCoordinate,
    LeafletLayerGroup,
    LeafletNamespace
} from "../../shared/lib/leaflet-loader";


export function
renderDriverDestinationPanel(
    destination:
        FixedLocation | null
): string {

    if (!destination) {

        return `
            <div
                class="driver-destination-warning"
            >
                ⚠️ Крайната точка BIOEXIS
                не можа да бъде заредена.
            </div>
        `;
    }


    const navigationUrl =
        buildGoogleMapsNavigationUrl(
            destination.latitude,
            destination.longitude
        );


    return `
        <div
            class="driver-destination-panel"
        >
            <span
                class="driver-destination-label"
            >
                ✅ Всички фирми са натоварени
            </span>

            <strong
                class="driver-destination-name"
            >
                🇬🇷 Продължете към
                ${escapeHtml(
                    destination.name
                )}
            </strong>

            ${
                destination.address

                    ? `
                        <div
                            class="driver-destination-address"
                        >
                            📍
                            ${escapeHtml(
                                destination.address
                            )}
                        </div>
                    `

                    : ""
            }

            <p>
                Това е крайната точка.
                За BIOEXIS не се изпраща известие.
            </p>

            ${
                navigationUrl

                    ? `
                        <a
                            href="${escapeHtml(
                                navigationUrl
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="
                                driver-navigation-button
                                driver-destination-navigation
                            "
                        >
                            🧭 Навигирай към BIOEXIS
                        </a>
                    `

                    : ""
            }
        </div>
    `;
}


function markerHtml(
    location:
        FixedLocation
): string {

    if (
        location.code ===
        FIXED_LOCATION_CODES.TRUCK_BASE
    ) {
        return `
            <div
                class="
                    driver-map-marker
                    driver-map-marker-base
                "
            >
                🏠
            </div>
        `;
    }


    return `
        <div
            class="
                driver-map-marker
                driver-map-marker-destination
            "
        >
            🏁
        </div>
    `;
}


export function
addDriverFixedLocationsToMap(
    leaflet:
        LeafletNamespace,

    layer:
        LeafletLayerGroup,

    locations:
        FixedLocation[]
): LeafletCoordinate[] {

    const points:
        LeafletCoordinate[] =
        [];


    for (
        const location
        of locations
    ) {

        const coordinates:
            LeafletCoordinate =
            [
                location.latitude,
                location.longitude
            ];


        const navigationUrl =
            location.code ===
                FIXED_LOCATION_CODES.BIOEXIS

                ? buildGoogleMapsNavigationUrl(
                    location.latitude,
                    location.longitude
                )

                : null;


        const icon =
            leaflet.divIcon({
                className:
                    "",

                html:
                    markerHtml(
                        location
                    ),

                iconSize:
                    [
                        44,
                        44
                    ],

                iconAnchor:
                    [
                        22,
                        22
                    ],

                popupAnchor:
                    [
                        0,
                        -20
                    ]
            });


        const description =
            location.code ===
                FIXED_LOCATION_CODES.BIOEXIS

                ? "Крайна точка на курса"

                : "База на камионите";


        const popup =
            `
                <div
                    class="driver-map-popup"
                >
                    <strong>
                        ${
                            location.code ===
                                FIXED_LOCATION_CODES.BIOEXIS
                                ? "🏁"
                                : "🏠"
                        }

                        ${escapeHtml(
                            location.name
                        )}
                    </strong>

                    <div>
                        ${escapeHtml(
                            description
                        )}
                    </div>

                    ${
                        location.address

                            ? `
                                <div>
                                    ${escapeHtml(
                                        location.address
                                    )}
                                </div>
                            `

                            : ""
                    }

                    ${
                        navigationUrl

                            ? `
                                <a
                                    href="${escapeHtml(
                                        navigationUrl
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    🧭 Навигирай към BIOEXIS
                                </a>
                            `

                            : ""
                    }
                </div>
            `;


        leaflet
            .marker(
                coordinates,
                {
                    icon,

                    title:
                        location.name,

                    alt:
                        location.name
                }
            )
            .addTo(
                layer
            )
            .bindPopup(
                popup
            );


        points.push(
            coordinates
        );
    }


    return points;
}
