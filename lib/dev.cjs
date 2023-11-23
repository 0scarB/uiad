#!/bin/node

const fs = require("node:fs/promises");
const child_process = require("node:child_process");

const WATCH_SERVER_HOST = "localhost";
const WATCH_SERVER_PORT = 8080;
const WATCH_BACKEND_POLL_INTERVAL = 0.05;
const WATCH_IN_BROWSER_POLL_INTERVAL = 0.2;
const VALID_OPTIONS = [
    "--format",
    "--gen-test-html",
    "--open-test-html",
    "--compile-other-ts-versions",
    "--watch",
    "--help",
    "-h",
];
const USAGE = [
    "node dev.cjs OPTIONS",
    "",
    "OPTIONS:",
    "   --gen-test-html     Generates 'test.html' that will run the",
    "                       tests when opened in the browser.",
    "",
    "   --open-test-html    Opens 'test.html' in your computer's",
    "                       default application for .html files,",
    "                       runs the tests in the browser and",
    "                       displays their results on the page.",
    "",
    "   --compile-other-ts-versions",
    "                       Compiles 'test.ts' with other TypeScript",
    "                       than the main one in use -- currently swc",
    "                       because of its speed.",
    "",
    "   --format            Formats contents of lib directory with",
    "                       Prettier.",
    "",
    "   --watch             Watches for changes in 'index.js',",
    "                       'index.d.ts, 'test.ts and 'dev.cjs'.",
    "                       If --gen-test-html is also supplied and",
    "                       'test.html' is open in your browser, the",
    "                       test will be rerun in the browser and the",
    "                       results will additionally be outputted ",
    "                       command line on file-change.",
    "                       If --format is also supplied, files will",
    "                       be reformated on file-change.",
    "                       If --compile-other-ts-versions is also",
    "                       supplied, then 'test.ts' will be compiled",
    "                       with the other TypeScript versions on",
    "                       file-change.",
    "",
    "   --help / -h         Displays this message.",
].join("\n");

async function main() {
    if (hasOption("--help") || hasOption("-h")) {
        console.log(USAGE);
        process.exit(0);
    }

    ensureValidOptions();

    if (hasOption("--watch")) {
        await watch();
        process.exit(0);
    }

    if (hasOption("--format")) {
        await format();
    }

    if (hasOption("--gen-test-html")) {
        await removeOldGeneratedTestFiles(["test.js", "test.html"]);
        await compileTypeScript({
            useSwc: true,
            tsMinorVersion: null,
            in_: "test.ts",
            out: "test.js",
        });
        await generateTestHTML({
            libFile: "index.js",
            testFile: "test.js",
            out: "test.html",
        });
    }

    if (hasOption("--open-test-html")) {
        await openURIWithDefaultApp("test.html");
    }

    if (hasOption("--compile-other-ts-versions")) {
        compileToOtherTypeScriptVersions();
    }
}

function ensureValidOptions() {
    const invalidOptions = process.argv
        .slice(1)
        .filter(
            (option) =>
                !VALID_OPTIONS.includes(option) &&
                !(typeof option === "string" && option.endsWith("dev.cjs")),
        );
    if (invalidOptions.length > 0) {
        console.log(USAGE);
        console.log("");
        console.log("!".repeat(70));
        console.log("ERROR: Received invalid options:");
        for (const option of invalidOptions) {
            console.log(`    ${option}`);
        }
        console.log("See correct usage above!");
        console.log("!".repeat(70));
        process.exit(1);
    }
}

async function format() {
    console.log("Formatting contents of lib/...");
    await exec(
        "./node_modules/prettier/bin/prettier.cjs --tab-width 4 --write .",
    );
    console.log("Formatted contents for lib/.");
}

async function compileToOtherTypeScriptVersions() {
    console.log(
        "Compiling with other TypeScript versions to ensure support...",
    );
    await Promise.all(
        ["4.7", "5.2"].map((tsMinorVersion) =>
            (async () => {
                await compileTypeScript({
                    tsMinorVersion,
                    useSwc: false,
                    in_: "test.ts",
                    out: `temp-test-${tsMinorVersion}.js`,
                });
                await fs.unlink(`temp-test-${tsMinorVersion}.js`);
            })(),
        ),
    );
    console.log("Compiled with other TypeScript versions.");
}

async function removeOldGeneratedTestFiles(filePaths) {
    for (const filePath of filePaths) {
        if (await fileExists(filePath)) {
            console.log(`Removing '${filePath}'...`);
            await fs.rm(filePath);
            console.log(`Removed '${filePath}'.`);
        }
    }
}

async function compileTypeScript({ tsMinorVersion, in_, out, useSwc }) {
    if (useSwc) {
        const swcExe = `./node_modules/@swc/cli/bin/swc.js`;
        const { stdout: versionInfo } = await exec(`${swcExe} --version`);
        const coreVersion = /@swc\/core:\s*(\d+\.\d+\.\d+)/g.exec(
            versionInfo,
        )[1];
        console.log(
            `[TypeScript swc/core ${coreVersion}]: Compiling '${in_}' to '${out}'...`,
        );
        try {
            await exec(`${swcExe} -o ${out} ${in_}`);
            console.log(
                `[TypeScript swc/core ${coreVersion}]: Compiled '${in_}' to '${out}'!`,
            );
        } catch {
            console.log(
                `[TypeScript swc/core ${coreVersion}]: Failed to compile '${in_}' to '${out}'!`,
            );
        }

        return;
    }

    const tscExe = `./node_modules/typescript-${tsMinorVersion}/bin/tsc`;
    let { stdout: versionInfo } = await exec(`${tscExe} --version`);
    const tscVersion = /Version\s*(\d+\.\d+\.\d+)/g.exec(versionInfo)[1];
    console.log(
        `[TypeScript tsc ${tscVersion}]: Compiling '${in_}' to '${out}'...`,
    );

    // --typeRoots without a value means that tsc will not include type
    // definitions from node_modules/@types by default.
    // This avoids conflicts with swc which installs stuff in @types.
    try {
        const inFileCopyPath = out.replace(/.js$/g, ".ts");
        if (inFileCopyPath !== in_) {
            await fs.cp(in_, inFileCopyPath);
        }
        await exec(
            `${tscExe} --allowJs --checkJs --target 'es6' --typeRoots --outDir '.' ${inFileCopyPath}`,
        );
        await fs.unlink(inFileCopyPath);
        console.log(
            `[TypeScript tsc ${tscVersion}]: Compiled '${in_}' to '${out}'.`,
        );
    } catch {
        console.log(
            `[TypeScript tsc ${tscVersion}]: Failed to compiled '${in_}' to '${out}'!`,
        );
    }
}

const TEST_HTML_CSS_OBJ = {
    body: {
        "background-color": "#000",
        color: "#eee",
        "font-size": "0.9rem",
        "line-height": "1.8rem",
    },
    main: {
        display: "flex",
        "justify-content": "center",
        padding: "32px",
    },
    ".log": {},
    ".log-line": {
        margin: "0",
        padding: "0 1rem",
    },
    ".log-line--success": {
        color: "#bfb",
        "background-color": "#020",
    },
    ".log-line--failure": {
        color: "#fcc",
        "background-color": "#400",
    },
};

const TEST_HTML_CSS_LINES = ((obj) => {
    function classObjToLines(selector, obj) {
        const lines = [`${selector} {`];
        for (const [cssProperty, cssValue] of Object.entries(obj)) {
            lines.push(`    ${cssProperty}: ${cssValue};`);
        }
        lines.push("}");

        return lines;
    }

    const lines = [];
    for (const [cssSelector, cssPropertiesObj] of Object.entries(obj)) {
        lines.push(...classObjToLines(cssSelector, cssPropertiesObj));
    }

    return lines;
})(TEST_HTML_CSS_OBJ);

function fillTestHTMLSkel({ headLines, bodyEndLines }) {
    return [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        ...headLines.map((line) => `    ${line}`),
        "    <title>UIAD Tests</title>",
        "    <style>",
        ...TEST_HTML_CSS_LINES.map((line) => `        ${line}`),
        "    </style>",
        "</head>",
        "<body>",
        '    <main><div id="log" /></main>',
        ...bodyEndLines.map((line) => `    ${line}`),
        "</body>",
        "</html>",
    ].join("\n");
}

async function generateTestHTML({ libFile, testFile, out }) {
    console.log(`Generating ${out}...`);

    const libFileContent = await fs.readFile(libFile, { encoding: "utf-8" });
    const testFileContent = await fs.readFile(testFile, { encoding: "utf-8" });

    const htmlFileContent = fillTestHTMLSkel({
        headLines: [
            '<script id="lib" type="module">',
            // The contents of 'index.js' is injected into the script tag with id=lib
            ...libFileContent.split("\n").map((line) => `    ${line}`),
            "</script>",
        ],
        bodyEndLines: [
            '<script type="module">',
            // The inner html of the script tag with id=lib is converted to a data url and imported
            'const libText = document.getElementById("lib").innerHTML',
            "const libModule = await import(`data:text/javascript;base64,` + btoa(libText))",
            // The import statement in 'test.ts'
            // is replaced with a call to the import function on the libModule object
            ...testFileContent
                .replace(/import (.+) from .+/, "const $1 = libModule")
                .split("\n")
                .map((line) => `    ${line}`),
            "</script>",
        ],
    });

    await fs.writeFile(out, htmlFileContent);

    console.log(`Generated ${out}.`);
}

async function openURIWithDefaultApp(uri) {
    console.log(`Opening ${uri} with default application...`);

    switch (process.platform) {
        case "linux":
            await exec(`xdg-open ${uri}`);
            break;
        case "darwin":
            await exec(`open ${uri}`);
            break;
        case "win32":
            await exec(`start ${uri}`);
            break;
        default:
            console.log(
                `ERROR: Unhandled operating system '${process.platform}'. Feel free to submit a PR :)`,
            );
            process.exit(1);
    }

    console.log(`Opened ${uri} with default application.`);
}

function watch() {
    let lastModTimes = {
        "./index.js": 0,
        "./index.d.ts": 0,
        "./test.ts": 0,
        "./dev.cjs": 0,
    };
    let rebuildPromise = Promise.resolve();
    let isRebuilding = false;
    let latestBuildWasServed = false;

    async function getNewModTimes() {
        const newModTimes = {};
        for (const filePath in lastModTimes) {
            const newModTime = (await fs.stat(filePath)).mtimeMs;
            newModTimes[filePath] = newModTime;
        }

        return newModTimes;
    }

    const poll = () =>
        new Promise((resolve) => {
            setInterval(() => {
                if (isRebuilding) {
                    return;
                }

                getNewModTimes().then((newModTimes) => {
                    const currentTime = new Date().toISOString();
                    let filesWereUpdated = false;
                    for (const filePath in newModTimes) {
                        if (newModTimes[filePath] > lastModTimes[filePath]) {
                            console.log(
                                `[Polling ${currentTime}]: ${filePath} changed!`,
                            );
                            filesWereUpdated = true;
                        }
                    }
                    if (!filesWereUpdated) {
                        // console.log(`[Polling ${currentTime}]: Nothing changed`)
                        return;
                    }

                    lastModTimes = newModTimes;

                    let currentPromise = Promise.resolve();
                    latestBuildWasServed = false;

                    if (hasOption("--gen-test-html")) {
                        isRebuilding = true;
                        rebuildPromise = (async () => {
                            // Be atomic -> copy test.old.js back to test.js
                            // if TypeScript compile fails.
                            if (await fileExists("test.js")) {
                                await fs.cp("test.js", "test.old.js");
                            }
                            try {
                                await compileTypeScript({
                                    useSwc: true,
                                    tsMinorVersion: null,
                                    in_: "test.ts",
                                    out: "test.js",
                                });
                                await fs.rm("test.old.js");
                            } catch (err) {
                                console.error(err);
                                if (await fileExists("test.old.js")) {
                                    await fs.cp("test.old.js", "test.js");
                                    await fs.rm("test.old.js");
                                }
                            }
                            isRebuilding = false;
                        })();
                        currentPromise = rebuildPromise;
                    }

                    currentPromise.then(() =>
                        (async () => {
                            if (hasOption("--format")) {
                                try {
                                    await format();
                                } catch (err) {
                                    console.error(err);
                                }
                            }

                            if (hasOption("--compile-other-ts-versions")) {
                                try {
                                    await compileToOtherTypeScriptVersions();
                                } catch (err) {
                                    console.error(err);
                                }
                            }
                        })(),
                    );
                });
            }, WATCH_BACKEND_POLL_INTERVAL * 1000);
        });

    const html = fillTestHTMLSkel({
        headLines: ['<script id="lib" src="/index.js" type="module"></script>'],
        bodyEndLines: [
            '<script src="/test.js" type="module"></script>',
            '<script type="module">',
            '    import {logText} from "./test.js";',
            '    fetch("/report", { method: "POST", body: logText });',
            "    // Hot Reloading",
            "    // TODO: Use web socket instead of polling",
            "    let maxRetries = 10;",
            "    const pollSetIntervalId = setInterval(() => {",
            '        fetch("/should-reload").then((res) => {',
            "            if (res.status === 200) {",
            "                res.text().then(text => {",
            '                    if (text === "yes") {',
            "                        location.reload();",
            "                    }",
            "                })",
            "           }",
            "        }).catch((e) => {",
            "            maxRetries--;",
            "            console.error(`Request to /should-reload endpoint failed: ${e}`);",
            "            console.error(`${maxRetries}/10 retries left!`);",
            "            if (maxRetries == 0) {",
            '                console.error("Reached 0 retries, stopping requests to /should-reload!");',
            "                clearInterval(pollSetIntervalId);",
            "            }",
            "        });",
            `    }, ${WATCH_IN_BROWSER_POLL_INTERVAL * 1000});`,
            "</script>",
        ],
    });

    async function handleConnect() {
        const serverURL = `http://${WATCH_SERVER_HOST}:${WATCH_SERVER_PORT}`;
        console.log(`Serving uiad test page at ${serverURL}`);

        if (hasOption("--open-test-html")) {
            await openURIWithDefaultApp(serverURL);
        }
    }

    // TODO: Use web socket!

    async function handleGETRoot(req, res) {
        await rebuildPromise;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        latestBuildWasServed = true;
    }

    async function handelGETJavaScriptFile(scriptFilePath, req, res) {
        await rebuildPromise;
        res.writeHead(200, { "Content-Type": "text/javascript" });
        const fd = await fs.open(scriptFilePath);
        const fileStream = fd.createReadStream();
        await fileStream.pipe(res);
    }

    async function handleGETShouldReload(req, res) {
        await rebuildPromise;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(latestBuildWasServed ? "no" : "yes");
        latestBuildWasServed = true;
    }

    async function handlePOSTReport(req, res) {
        const body = [];
        req.on("data", (chunk) => body.push(chunk));
        req.on("end", () => console.log(Buffer.concat(body).toString()));
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
    }

    const runServer = () =>
        new Promise((resolve, reject) => {
            const http = require("node:http");

            const server = http.createServer((req, res) => {
                if (req.url === "/" && req.method === "GET") {
                    handleGETRoot(req, res).catch((err) => reject(err));
                } else if (
                    (req.url === "/test.js" || req.url === "/index.js") &&
                    req.method === "GET"
                ) {
                    handelGETJavaScriptFile(req.url.slice(1), req, res).catch(
                        (err) => reject(err),
                    );
                } else if (
                    req.url === "/should-reload" &&
                    req.method === "GET"
                ) {
                    handleGETShouldReload(req, res).catch((err) => reject(err));
                } else if (req.url === "/report" && req.method === "POST") {
                    handlePOSTReport(req, res);
                } else {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end(`Unhandled route '${req.url}'`);
                }
            });

            server.listen(WATCH_SERVER_PORT, WATCH_SERVER_HOST, () => {
                handleConnect().catch((err) => reject(err));
            });
        });

    const promises = [poll()];
    if (hasOption("--gen-test-html")) {
        promises.push(runServer());
    }

    return Promise.all(promises);
}

// Utilities
// =========

function hasOption(option) {
    if (!VALID_OPTIONS.includes(option)) {
        throw new Error(`Called 'hasOption' on invalid option '${option}'!`);
    }
    return process.argv.includes(option);
}

async function fileExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function exec(cmd) {
    return new Promise((resolve, reject) => {
        child_process.exec(cmd, (error, stdout, stderr) => {
            if (error !== null) {
                console.log("!".repeat(70));
                console.log("ERROR: Command failed:");
                console.log(indent(cmd));
                console.log();
                if (stdout.trim() !== "") {
                    console.log("stdout:");
                    console.log(indent(stdout));
                }
                if (stderr.trim() !== "") {
                    console.log("stderr:");
                    console.log(indent(stderr));
                }
                console.log("!".repeat(70));
                reject({ error, stdout, stderr });
            }
            resolve({ error, stdout, stderr });
        });
    });
}

function indent(str) {
    const lines = str.split("\n");
    return lines.map((line) => `    ${line}`).join("\n");
}

main();
