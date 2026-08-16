import {
    supabase
} from "../../shared/api/supabase";


export type DriverArchiveSummary = {
    payableKm: number;

    tripCount: number;

    workDays: number;
};


export type DriverArchiveSegment = {
    id: string;

    tripId: string;

    tripNumber: number;

    tripStatus: string;

    tripCompletedAt:
        string | null;


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
};


export type DriverArchiveMonth = {
    month: string;

    timezone: string;

    summary:
        DriverArchiveSummary;

    segments:
        DriverArchiveSegment[];
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


function readString(
    value: unknown
): string {

    return typeof value ===
        "string"
        ? value
        : "";
}


function readNullableString(
    value: unknown
): string | null {

    return typeof value ===
        "string"
        ? value
        : null;
}


function readNumber(
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


function parseSegment(
    value: unknown
): DriverArchiveSegment | null {

    if (!isRecord(value)) {
        return null;
    }


    const id =
        readString(
            value.id
        );

    const tripId =
        readString(
            value.tripId
        );

    const workDate =
        readString(
            value.workDate
        );

    const endedAt =
        readString(
            value.endedAt
        );


    if (
        !id ||
        !tripId ||
        !workDate ||
        !endedAt
    ) {
        return null;
    }


    return {
        id,

        tripId,

        tripNumber:
            readNumber(
                value.tripNumber
            ),

        tripStatus:
            readString(
                value.tripStatus
            ),

        tripCompletedAt:
            readNullableString(
                value.tripCompletedAt
            ),


        segmentNumber:
            readNumber(
                value.segmentNumber
            ),

        truckNumber:
            readString(
                value.truckNumber
            ) ||
            "Камион",

        trailerNumber:
            readNullableString(
                value.trailerNumber
            ),


        startKm:
            readNumber(
                value.startKm
            ),

        endKm:
            readNumber(
                value.endKm
            ),

        totalKm:
            readNumber(
                value.totalKm
            ),


        startedAt:
            readString(
                value.startedAt
            ),

        endedAt,

        workDate,

        endReason:
            readNullableString(
                value.endReason
            )
    };
}


function parseArchive(
    value: unknown
): DriverArchiveMonth {

    if (!isRecord(value)) {

        throw new Error(
            "Архивът върна невалиден отговор."
        );
    }


    const summary =
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


    return {
        month:
            readString(
                value.month
            ),

        timezone:
            readString(
                value.timezone
            ) ||
            "Europe/Sofia",

        summary: {
            payableKm:
                readNumber(
                    summary.payableKm
                ),

            tripCount:
                readNumber(
                    summary.tripCount
                ),

            workDays:
                readNumber(
                    summary.workDays
                )
        },

        segments:
            rawSegments
                .map(
                    parseSegment
                )
                .filter(
                    (
                        segment
                    ): segment is
                        DriverArchiveSegment =>
                        segment !== null
                )
    };
}


export async function
loadDriverArchiveMonth(
    monthStart: string
): Promise<DriverArchiveMonth> {

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
            "trips_get_driver_archive",
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
