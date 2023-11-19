#!/bin/node

const fs = require("node:fs/promises");
const child_process = require("node:child_process");

const DEV_SERVER_HOST = "localhost";
const DEV_SERVER_PORT = 8080;
const DEV_SERVER_POLL_FILES_INTERVAL = 0.05;
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

async function generateTestHTML({ libFile, testFile, out }) {
    console.log(`Generating ${out}...`);

    const libFileContent = await fs.readFile(libFile, { encoding: "utf-8" });
    const testFileContent = await fs.readFile(testFile, { encoding: "utf-8" });

    const htmlFileContent = [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<script id="lib" type="module">',
        // The contents of 'index.js' is injected into the script tag with id=lib
        libFileContent,
        "</script>",
        "    <title>UIAD Tests</title>",
        "</head>",
        "<body>",
        '    <main id="log"></main>',
        '<script type="module">',
        // The inner html of the script tag with id=lib is converted to a data url and imported
        'const libText = document.getElementById("lib").innerHTML',
        "const libModule = await import(`data:text/javascript;base64,` + btoa(libText))",
        // The import statement in 'test.ts'
        // is replaced with a call to the import function on the libModule object
        testFileContent.replace(/import (.+) from .+/, "const $1 = libModule"),
        "</script>",
        "</body>",
        "</html>",
    ].join("\n");

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

                    if (hasOption("--gen-test-html")) {
                        isRebuilding = true;
                        rebuildPromise = (async () => {
                            await removeOldGeneratedTestFiles([
                                "test.js",
                                "test.html",
                            ]);
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
                            latestBuildWasServed = false;
                            isRebuilding = false;
                        })();
                        currentPromise = rebuildPromise;
                    }

                    currentPromise.then(() =>
                        (async () => {
                            if (hasOption("--format")) {
                                await format();
                            }

                            if (hasOption("--compile-other-ts-versions")) {
                                await compileToOtherTypeScriptVersions();
                            }
                        })(),
                    );
                });
            }, DEV_SERVER_POLL_FILES_INTERVAL * 1000);
        });

    async function handleConnect() {
        const serverURL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`;
        console.log(`Serving uiad test page at ${serverURL}`);

        if (hasOption("--open-test-html")) {
            await openURIWithDefaultApp(serverURL);
        }
    }

    // TODO: Use web socket!

    async function handleGETRoot(req, res) {
        await rebuildPromise;
        const htmlContent = await fs.readFile("./test.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlContent);
        latestBuildWasServed = true;
    }

    async function handleGETPageReload(req, res) {
        if (latestBuildWasServed) {
            res.writeHead(204, { "Content-Type": "text/plain" });
            res.end("No content to reload!");
            return;
        }

        await rebuildPromise;
        const htmlContent = await fs.readFile("./test.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlContent);
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
                } else if (req.url === "/page-reload" && req.method === "GET") {
                    handleGETPageReload(req, res).catch((err) => reject(err));
                } else if (req.url === "/report" && req.method === "POST") {
                    handlePOSTReport(req, res);
                } else {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end(`Unhandled route '${req.url}'`);
                }
            });

            server.listen(DEV_SERVER_PORT, DEV_SERVER_HOST, () => {
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
