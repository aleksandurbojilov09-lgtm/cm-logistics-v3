export type LeafletCoordinate = [
    number,
    number
];


export type LeafletLatLng = {
    lat: number;
    lng: number;
};


export type LeafletMouseEvent = {
    latlng: LeafletLatLng;
};


export type LeafletMap = {
    setView(
        coordinates: LeafletCoordinate,
        zoom: number
    ): LeafletMap;

    fitBounds(
        coordinates: LeafletCoordinate[],
        options?: {
            padding?: [
                number,
                number
            ];

            maxZoom?: number;
        }
    ): LeafletMap;

    invalidateSize():
        LeafletMap;

    on(
        event: "click",
        handler: (
            event: LeafletMouseEvent
        ) => void
    ): LeafletMap;

    remove():
        void;
};


export type LeafletLayerGroup = {
    addTo(
        map: LeafletMap
    ): LeafletLayerGroup;

    clearLayers():
        LeafletLayerGroup;
};


export type LeafletMarker = {
    addTo(
        layer:
            LeafletLayerGroup |
            LeafletMap
    ): LeafletMarker;

    bindPopup(
        html: string
    ): LeafletMarker;

    setLatLng(
        coordinates:
            LeafletCoordinate |
            LeafletLatLng
    ): LeafletMarker;

    getLatLng():
        LeafletLatLng;

    on(
        event: "dragend",
        handler: () => void
    ): LeafletMarker;
};


type LeafletIcon =
    object;


export type LeafletNamespace = {

    map(
        element:
            string |
            HTMLElement
    ): LeafletMap;


    tileLayer(
        url: string,
        options: {
            maxZoom: number;
            attribution: string;
        }
    ): {
        addTo(
            map: LeafletMap
        ): unknown;
    };


    layerGroup():
        LeafletLayerGroup;


    divIcon(
        options: {
            className?: string;
            html: string;
            iconSize: [
                number,
                number
            ];
            iconAnchor: [
                number,
                number
            ];
            popupAnchor?: [
                number,
                number
            ];
        }
    ): LeafletIcon;


    marker(
        coordinates:
            LeafletCoordinate,

        options?: {
            icon?: LeafletIcon;
            title?: string;
            alt?: string;
            draggable?: boolean;
        }
    ): LeafletMarker;
};


declare global {

    interface Window {
        L?:
            LeafletNamespace;
    }
}


const LEAFLET_CSS_ID =
    "k3LeafletCss";


const LEAFLET_SCRIPT_ID =
    "k3LeafletScript";


const LEAFLET_CSS_URL =
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";


const LEAFLET_SCRIPT_URL =
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";


const LEAFLET_CSS_INTEGRITY =
    "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";


const LEAFLET_SCRIPT_INTEGRITY =
    "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";


function ensureLeafletCss():
void {

    if (
        document.getElementById(
            LEAFLET_CSS_ID
        )
    ) {
        return;
    }


    const link =
        document.createElement(
            "link"
        );


    link.id =
        LEAFLET_CSS_ID;

    link.rel =
        "stylesheet";

    link.href =
        LEAFLET_CSS_URL;

    link.integrity =
        LEAFLET_CSS_INTEGRITY;

    link.crossOrigin =
        "anonymous";


    document.head.appendChild(
        link
    );
}


function loadLeafletScript():
Promise<void> {

    if (window.L) {
        return Promise.resolve();
    }


    const existing =
        document.getElementById(
            LEAFLET_SCRIPT_ID
        ) as HTMLScriptElement | null;


    if (existing) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                if (window.L) {
                    resolve();
                    return;
                }


                existing.addEventListener(
                    "load",
                    () => resolve(),
                    {
                        once: true
                    }
                );


                existing.addEventListener(
                    "error",
                    () => reject(
                        new Error(
                            "Leaflet не можа да бъде зареден."
                        )
                    ),
                    {
                        once: true
                    }
                );
            }
        );
    }


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const script =
                document.createElement(
                    "script"
                );


            script.id =
                LEAFLET_SCRIPT_ID;

            script.src =
                LEAFLET_SCRIPT_URL;

            script.integrity =
                LEAFLET_SCRIPT_INTEGRITY;

            script.crossOrigin =
                "anonymous";

            script.async =
                true;


            script.addEventListener(
                "load",
                () => resolve(),
                {
                    once: true
                }
            );


            script.addEventListener(
                "error",
                () => reject(
                    new Error(
                        "Leaflet не можа да бъде зареден."
                    )
                ),
                {
                    once: true
                }
            );


            document.head.appendChild(
                script
            );
        }
    );
}


export async function
loadLeaflet():
Promise<LeafletNamespace> {

    ensureLeafletCss();


    await loadLeafletScript();


    if (!window.L) {
        throw new Error(
            "Картата не можа да бъде заредена."
        );
    }


    return window.L;
}
