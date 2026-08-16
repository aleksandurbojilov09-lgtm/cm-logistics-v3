import fs from "node:fs";
import path from "node:path";


const MIN_PX =
    14;

const MIN_REM =
    0.875;


const roots = [
    "src",
    "styles"
];


const extensions =
    new Set([
        ".css",
        ".ts",
        ".html"
    ]);


const violations =
    [];


function inspectFile(
    filePath
) {

    const text =
        fs.readFileSync(
            filePath,
            "utf8"
        );


    const pxRegex =
        /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi;

    const remRegex =
        /font-size\s*:\s*(\d+(?:\.\d+)?)rem/gi;

    const emRegex =
        /font-size\s*:\s*(\d+(?:\.\d+)?)em/gi;

    const percentRegex =
        /font-size\s*:\s*(\d+(?:\.\d+)?)%/gi;


    for (
        const match
        of text.matchAll(
            pxRegex
        )
    ) {

        const value =
            Number(
                match[1]
            );


        if (
            value <
            MIN_PX
        ) {

            violations.push(
                `${filePath}: ${value}px`
            );
        }
    }


    for (
        const match
        of text.matchAll(
            remRegex
        )
    ) {

        const value =
            Number(
                match[1]
            );


        if (
            value <
            MIN_REM
        ) {

            violations.push(
                `${filePath}: ${value}rem`
            );
        }
    }


    for (
        const match
        of text.matchAll(
            emRegex
        )
    ) {

        const value =
            Number(
                match[1]
            );


        if (
            value <
            0.875
        ) {

            violations.push(
                `${filePath}: ${value}em`
            );
        }
    }


    for (
        const match
        of text.matchAll(
            percentRegex
        )
    ) {

        const value =
            Number(
                match[1]
            );


        if (
            value <
            87.5
        ) {

            violations.push(
                `${filePath}: ${value}%`
            );
        }
    }
}


function walk(
    target
) {

    if (
        !fs.existsSync(
            target
        )
    ) {
        return;
    }


    const stat =
        fs.statSync(
            target
        );


    if (
        stat.isFile()
    ) {

        if (
            extensions.has(
                path.extname(
                    target
                )
            )
        ) {
            inspectFile(
                target
            );
        }

        return;
    }


    for (
        const entry
        of fs.readdirSync(
            target
        )
    ) {

        walk(
            path.join(
                target,
                entry
            )
        );
    }
}


for (
    const root
    of roots
) {
    walk(
        root
    );
}


if (
    fs.existsSync(
        "index.html"
    )
) {
    inspectFile(
        "index.html"
    );
}


if (
    violations.length >
    0
) {

    console.error(
        "❌ Забранен font-size под 14px:"
    );

    for (
        const item
        of violations
    ) {
        console.error(
            `   ${item}`
        );
    }

    process.exit(
        1
    );
}


console.log(
    "✅ Font floor OK: няма текст под 14px."
);
