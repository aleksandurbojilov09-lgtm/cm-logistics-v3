import {
    supabase
} from "../../shared/api/supabase";


export type AdminDriverArchiveSummary = {
    completedTrips: number;

    payableKm: number;

    loadedTons: number;

    discrepancyCount:
        number | null;
};


export type AdminDriverArchiveSegment = {
    id: string;

    tripId: string;

    tripNumber: number;

    tripStatus: string;

    tripCompletedAt:
        string | null;


    driverId: string;

    driverName: string;


    segmentNumber: number;

    truckNumber: string;

    trailerNumber:
        string | null;


    startKm: number;

    endKm: number;

    totalKm: number;


    startedAt: string;

    endedAt: string;

    workDate: string;

    endReason:
        string | null;


    tripLoadedTons: number;

    tripDiscrepancyCount:
        number | null;
};


export type AdminDriverArchiveMonth = {
    month: string;

    timezone: string;

    canReadDiscrepancies: boolean;

    summary:
        AdminDriverArchiveSummary;

    segments:
        AdminDriverArchiveSegment[];
};


type JsonRecord =
    Record<string, unknown>;


/* =========================================================
   JSON HELPERS
   ========================================================= */


function isRecord(
    value: unknown
): value is JsonRecord {

    return (
        typeof value ===
            "object" &&
        value !== null &&
        !Array.isArray(
            value
        )
    );
}


function stringValue(
    value: unknown
): string {

    return typeof value ===
        "string"
        ? value
        : "";
}


function nullableString(
    value: unknown
): string | null {

    return typeof value ===
        "string"
        ? value
        : null;
}


function numberValue(
    value: unknown
): number {

    if (
        typeof value ===
        "number"
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : 0;
    }


    if (
        typeof value ===
        "string"
    ) {

        const parsed =
            Number(value);

        return Number.isFinite(
            parsed
        )
            ? parsed
            : 0;
    }


    return 0;
}


function nullableNumber(
    value: unknown
): number | null {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const parsed =
        numberValue(
            value
        );


    return Number.isFinite(
        parsed
    )
        ? parsed
        : null;
}


/* =========================================================
   PARSING
   ========================================================= */


function parseSegment(
    value: unknown
): AdminDriverArchiveSegment | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        stringValue(
            value.id
        );

    const tripId =
        stringValue(
            value.tripId
        );

    const driverId =
        stringValue(
            value.driverId
        );

    const endedAt =
        stringValue(
            value.endedAt
        );

    const workDate =
        stringValue(
            value.workDate
        );


    if (
        !id ||
        !tripId ||
        !driverId ||
        !endedAt ||
        !workDate
    ) {
        return null;
    }


    return {
        id,

        tripId,

        tripNumber:
            numberValue(
                value.tripNumber
            ),

        tripStatus:
            stringValue(
                value.tripStatus
            ),

        tripCompletedAt:
            nullableString(
                value.tripCompletedAt
            ),


        driverId,

        driverName:
            stringValue(
                value.driverName
            ) ||
            "Шофьор",


        segmentNumber:
            numberValue(
                value.segmentNumber
            ),

        truckNumber:
            stringValue(
                value.truckNumber
            ) ||
            "Камион",

        trailerNumber:
            nullableString(
                value.trailerNumber
            ),


        startKm:
            numberValue(
                value.startKm
            ),

        endKm:
            numberValue(
                value.endKm
            ),

        totalKm:
            numberValue(
                value.totalKm
            ),


        startedAt:
            stringValue(
                value.startedAt
            ),

        endedAt,

        workDate,

        endReason:
            nullableString(
                value.endReason
            ),


        tripLoadedTons:
            numberValue(
                value.tripLoadedTons
            ),

        tripDiscrepancyCount:
            nullableNumber(
                value.tripDiscrepancyCount
            )
    };
}


function parseArchive(
    value: unknown
): AdminDriverArchiveMonth {

    if (!isRecord(value)) {

        throw new Error(
            "Архивът върна невалиден отговор."
        );
    }


    const rawSummary =
        isRecord(
            value.summary
        )
            ? value.summary
            : {};


    const rawSegments =
        Array.isArray(
            value.segments
        )
            ? value.segments
            : [];


    const segments =
        rawSegments
            .map(
                parseSegment
            )
            .filter(
                (
                    segment
                ): segment is
                    AdminDriverArchiveSegment =>
                    segment !== null
            );


    return {
        month:
            stringValue(
                value.month
            ),

        timezone:
            stringValue(
                value.timezone
            ) ||
            "Europe/Sofia",

        canReadDiscrepancies:
            value.canReadDiscrepancies ===
                true,

        summary: {
            completedTrips:
                numberValue(
                    rawSummary
                        .completedTrips
                ),

            payableKm:
                numberValue(
                    rawSummary
                        .payableKm
                ),

            loadedTons:
                numberValue(
                    rawSummary
                        .loadedTons
                ),

            discrepancyCount:
                nullableNumber(
                    rawSummary
                        .discrepancies
                )
        },

        segments
    };
}


/* =========================================================
   API
   ========================================================= */


export async function
loadAdminDriverArchiveMonth(
    monthStart: string
): Promise<AdminDriverArchiveMonth> {

    if (
        !/^\d{4}-\d{2}-01$/
            .test(
                monthStart
            )
    ) {

        throw new Error(
            "Невалиден архивен месец."
        );
    }


    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_admin_get_driver_archive",
            {
                p_month:
                    monthStart
            }
        );


    if (error) {

        throw new Error(
            error.message ||
            "Архивът не можа да бъде зареден."
        );
    }


    return parseArchive(
        data
    );
}
