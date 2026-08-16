import {
    supabase
} from "../../shared/api/supabase";


export type AdminBioexisTrailer = {
    id: string;

    registrationNumber: string;

    bioexisPermitNumber:
        string | null;

    isActive: boolean;
};


export type AdminBioexisSummary = {
    tripCount: number;

    totalKm: number;

    loadedKg: number;

    loadedTons: number;
};


export type AdminBioexisRow = {
    tripId: string;

    tripNumber: number;

    completedAt: string;

    completedDate: string;

    companies: string;


    segmentId: string;

    segmentNumber: number;

    driverName: string;

    truckNumber: string;

    trailerNumber:
        string | null;

    positionNumber:
        string | null;


    startKm: number;

    endKm: number;

    km: number;


    startedAt: string;

    endedAt: string;

    endReason:
        string | null;


    loadedKg:
        number | null;

    loadedTons:
        number | null;

    firstSegment: boolean;
};


export type AdminBioexisReport = {
    month: string;

    timezone: string;

    trailers:
        AdminBioexisTrailer[];

    selectedTrailer:
        AdminBioexisTrailer | null;

    summary:
        AdminBioexisSummary;

    rows:
        AdminBioexisRow[];
};


type JsonRecord =
    Record<string, unknown>;


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
        "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value ===
        "string"
    ) {
        const parsed =
            Number(value);

        if (
            Number.isFinite(parsed)
        ) {
            return parsed;
        }
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

    if (
        typeof value ===
        "number" &&
        Number.isFinite(value)
    ) {
        return value;
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
            : null;
    }

    return null;
}


function parseTrailer(
    value: unknown
): AdminBioexisTrailer | null {

    if (!isRecord(value)) {
        return null;
    }

    const id =
        stringValue(
            value.id
        );

    const registrationNumber =
        stringValue(
            value.registrationNumber
        );

    if (
        !id ||
        !registrationNumber
    ) {
        return null;
    }

    return {
        id,

        registrationNumber,

        bioexisPermitNumber:
            nullableString(
                value.bioexisPermitNumber
            ),

        isActive:
            value.isActive ===
            true
    };
}


function parseRow(
    value: unknown
): AdminBioexisRow | null {

    if (!isRecord(value)) {
        return null;
    }

    const tripId =
        stringValue(
            value.tripId
        );

    const segmentId =
        stringValue(
            value.segmentId
        );

    if (
        !tripId ||
        !segmentId
    ) {
        return null;
    }

    return {
        tripId,

        tripNumber:
            numberValue(
                value.tripNumber
            ),

        completedAt:
            stringValue(
                value.completedAt
            ),

        completedDate:
            stringValue(
                value.completedDate
            ),

        companies:
            stringValue(
                value.companies
            ),


        segmentId,

        segmentNumber:
            numberValue(
                value.segmentNumber
            ),

        driverName:
            stringValue(
                value.driverName
            ) ||
            "Шофьор",

        truckNumber:
            stringValue(
                value.truckNumber
            ) ||
            "Камион",

        trailerNumber:
            nullableString(
                value.trailerNumber
            ),

        positionNumber:
            nullableString(
                value.positionNumber
            ),


        startKm:
            numberValue(
                value.startKm
            ),

        endKm:
            numberValue(
                value.endKm
            ),

        km:
            numberValue(
                value.km
            ),


        startedAt:
            stringValue(
                value.startedAt
            ),

        endedAt:
            stringValue(
                value.endedAt
            ),

        endReason:
            nullableString(
                value.endReason
            ),


        loadedKg:
            nullableNumber(
                value.loadedKg
            ),

        loadedTons:
            nullableNumber(
                value.loadedTons
            ),

        firstSegment:
            value.firstSegment ===
            true
    };
}


function parseReport(
    value: unknown
): AdminBioexisReport {

    if (!isRecord(value)) {
        throw new Error(
            "BIOEXIS отчетът върна невалиден отговор."
        );
    }

    const rawTrailers =
        Array.isArray(
            value.trailers
        )
            ? value.trailers
            : [];

    const trailers =
        rawTrailers
            .map(
                parseTrailer
            )
            .filter(
                (
                    trailer
                ): trailer is
                    AdminBioexisTrailer =>
                    trailer !== null
            );

    const selectedTrailer =
        parseTrailer(
            value.selectedTrailer
        );

    const rawSummary =
        isRecord(
            value.summary
        )
            ? value.summary
            : {};

    const rawRows =
        Array.isArray(
            value.rows
        )
            ? value.rows
            : [];

    const rows =
        rawRows
            .map(
                parseRow
            )
            .filter(
                (
                    row
                ): row is
                    AdminBioexisRow =>
                    row !== null
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

        trailers,

        selectedTrailer,

        summary: {
            tripCount:
                numberValue(
                    rawSummary.tripCount
                ),

            totalKm:
                numberValue(
                    rawSummary.totalKm
                ),

            loadedKg:
                numberValue(
                    rawSummary.loadedKg
                ),

            loadedTons:
                numberValue(
                    rawSummary.loadedTons
                )
        },

        rows
    };
}


export async function
loadAdminBioexisReport(
    monthStart: string,
    trailerId:
        string | null
): Promise<AdminBioexisReport> {

    if (
        !/^\d{4}-\d{2}-01$/
            .test(
                monthStart
            )
    ) {
        throw new Error(
            "Невалиден месец за BIOEXIS отчет."
        );
    }

    const {
        data,
        error
    } =
        await supabase.rpc(
            "trips_admin_get_bioexis_report",
            {
                p_month:
                    monthStart,

                p_trailer_id:
                    trailerId
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "BIOEXIS отчетът не можа да бъде зареден."
        );
    }

    return parseReport(
        data
    );
}
