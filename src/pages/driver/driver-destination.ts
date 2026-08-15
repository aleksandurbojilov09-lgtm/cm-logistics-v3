import "../../../styles/pages/driver-destination.css";

import type {
    FixedLocation
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
                🏁 Крайна точка
            </span>

            <strong
                class="driver-destination-name"
            >
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
                Всички фирми са натоварени.
                Продължи към BIOEXIS и
                приключи курса там.
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


export function
addDriverDestinationToMap(
    leaflet:
        LeafletNamespace,

    layer:
        LeafletLayerGroup,

    destination:
        FixedLocation | null
): LeafletCoordinate | null {

    if (!destination) {
        return null;
    }


    const coordinates:
        LeafletCoordinate =
        [
            destination.latitude,
            destination.longitude
        ];


    const navigationUrl =
        buildGoogleMapsNavigationUrl(
            destination.latitude,
            destination.longitude
        );


    const icon =
        leaflet.divIcon({
            className:
                "",

            html:
                `
                    <div
                        class="
                            driver-map-marker
                            driver-map-marker-destination
                        "
                    >
                        🏁
                    </div>
                `,

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


    const popup =
        `
            <div
                class="driver-map-popup"
            >
                <strong>
                    🏁
                    ${escapeHtml(
                        destination.name
                    )}
                </strong>

                <div>
                    Крайна точка на курса
                </div>

                ${
                    destination.address

                        ? `
                            <div>
                                ${escapeHtml(
                                    destination.address
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
                    destination.name,

                alt:
                    `Крайна точка ${destination.name}`
            }
        )
        .addTo(
            layer
        )
        .bindPopup(
            popup
        );


    return coordinates;
}
