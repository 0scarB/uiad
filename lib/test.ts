import {
    DOMElementSpec,
    ReactiveValue,
    createElement,
    readWriteReactiveValue,
    reactiveElement,
    ok,
    err,
} from "./index.js";

function test() {
    describe("Result -> Ok/Err", () => {
        describe("onOk", () => {
            it("should be called when result is ok", () => {
                let wasCalled = false;
                ok("x").onOk(() => (wasCalled = true));
                assertTrue(wasCalled);
            });
            it("should not be called when result is err", () => {
                let wasCalled = false;
                err("MyErr", "msg").onOk(() => (wasCalled = true));
                assertFalse(wasCalled);
            });
            it("should be passed the ok value", () => {
                let okValue = "unknown";
                ok("ok").onOk((value) => (okValue = value));
                assertEqual(okValue, "ok");
            });
        });
        describe("onErr", () => {
            it("should be called when result is err", () => {
                let wasCalled = false;
                err("MyErr", "msg").onErr(() => (wasCalled = true));
                assertTrue(wasCalled);
            });
            it("should not be called when result is ok", () => {
                let wasCalled = false;
                ok("x").onErr(() => (wasCalled = true));
                assertFalse(wasCalled);
            });
            it("should be passed the error kind and message", () => {
                let errKind = "";
                let errMsg = "";
                err("MyErr", "Reactor meltdown!").onErr((kind, msg) => {
                    errKind = kind;
                    errMsg = msg;
                });
                assertEqual(errKind, "MyErr");
                assertEqual(errMsg, "Reactor meltdown!");
            });
        });
        describe("logOk", () => {
            it("should log when result is ok", () => {
                assertConsoleLog(() => {
                    ok("ok").logOk();
                });
            });
            it("should not log when result is err", () => {
                assertNoConsoleLog(() => {
                    err("MyErr", "msg").logOk();
                });
            });
            it("should log ok value when 0 args are provided", () => {
                assertConsoleLog(() => {
                    ok("ok").logOk();
                }, "ok");
            });
            it("should log the 1st arg if 1 arg is provided", () => {
                assertConsoleLog(() => {
                    ok("ok").logOk("foo");
                }, "foo");
            });
            it(
                [
                    "should use the 1st arg to specify the console method",
                    "if 2 args are provided",
                ],
                () => {
                    assertConsoleError(() => {
                        ok("ok").logOk("error", "I expected this to be err");
                    }, "I expected this to be err");
                },
            );
            it(
                [
                    "it should call the 2nd arg to create the message",
                    " when the second arg is a function",
                ],
                () => {
                    assertConsoleError(() => {
                        ok(2).logOk("error", (x) => `${2 * x}`);
                    }, "4");
                },
            );
        });
        describe("logErr", () => {
            it("should log error when result is err", () => {
                assertConsoleError(() => {
                    err("MyErr", "msg").logErr();
                });
            });
            it("should not log error when result is ok", () => {
                assertNoConsoleError(() => {
                    ok("x").logErr();
                });
            });
            it(
                [
                    "should log error '<error king>: <error message>' ",
                    "when 0 args are provided",
                ],
                () => {
                    assertConsoleError(() => {
                        err("MyErr", "msg").logErr();
                    }, "MyErr: msg");
                },
            );
            it("should log the 1st arg as an error if 1 arg is provided", () => {
                assertConsoleError(() => {
                    err("MyErr", "msg").logErr("foo");
                }, "foo");
            });
            it(
                [
                    "should use the 1st arg to specify the console method",
                    "if 2 args are provided",
                ],
                () => {
                    assertConsoleLog(() => {
                        err("MyErr", "msg").logErr(
                            "log",
                            "this error was expected",
                        );
                    }, "this error was expected");
                },
            );
            it(
                [
                    "it should call the 2nd arg to create the message",
                    " when the second arg is a function",
                ],
                () => {
                    assertConsoleLog(() => {
                        err("MyErr", "msg").logErr(
                            "log",
                            (kind, msg) => `${kind.toUpperCase()}: ${msg}!`,
                        );
                    }, "MYERR: msg!");
                },
            );
        });
    });
    describe("createElement", () => {
        it("should create text nodes", () => {
            const el = createElement("test");
            assertTrue(el instanceof Node);
        });
        it("should create empty elements", () => {
            const el = createElement(["div"]);
            assertEqual(el.tagName, "DIV");
            assertTrue(el instanceof Element);
        });
        it("should create elements just with attributes", () => {
            const el = createElement(["canvas", { width: 100, height: "100" }]);
            assertEqual(el.tagName, "CANVAS");
            assertTrue(el.hasAttribute("width"));
            assertTrue(el.hasAttribute("height"));
            assertEqual(el.getAttribute("width"), "100");
            assertEqual(el.getAttribute("height"), "100");
        });
        it("should create elements just with children", () => {
            const el = createElement([
                "ol",
                [
                    ["li", ["item1"]],
                    ["li", ["item2"]],
                ],
            ]);
            assertEqual(el.tagName, "OL");
            assertEqual(el.children[0].tagName, "LI");
            assertEqual(el.children[1].tagName, "LI");
            assertEqual(el.children[0].innerHTML, "item1");
            assertEqual(el.children[1].innerHTML, "item2");
        });
        it("should create elements with attributes and children", () => {
            const el = createElement([
                "ol",
                { width: 100, height: "100" },
                [
                    ["li", ["item1"]],
                    ["li", ["item2"]],
                ],
            ]);
            assertEqual(el.tagName, "OL");
            assertTrue(el.hasAttribute("width"));
            assertTrue(el.hasAttribute("height"));
            assertEqual(el.getAttribute("width"), "100");
            assertEqual(el.getAttribute("height"), "100");
            assertEqual(el.children[0].tagName, "LI");
            assertEqual(el.children[1].tagName, "LI");
            assertEqual(el.children[0].innerHTML, "item1");
            assertEqual(el.children[1].innerHTML, "item2");
        });
        it("should join the classes attribute to class", () => {
            const el = createElement([
                "div",
                { classes: ["class1", "class2"] },
            ]);
            assertEqual(el.getAttribute("class"), "class1 class2");
            assertEqual(el.classList[0], "class1");
            assertEqual(el.classList[1], "class2");
        });
        it("should serialize the style attribute when passed as an object", () => {
            const el = createElement([
                "div",
                {
                    style: {
                        color: "hotpink",
                        "font-family": "Comic Sans",
                    },
                },
                ["beautiful text"],
            ]);
            assertEqual(
                el.getAttribute("style"),
                "color: hotpink; font-family: Comic Sans",
            );
        });
        it("should add event listeners for attributes starting with 'on'", () => {
            let count = 0;
            const el = createElement([
                "button",
                {
                    onclick: () => count++,
                },
                ["increment"],
            ]) as HTMLButtonElement;

            const body = document.getElementsByTagName("body")[0];
            body.appendChild(el);
            for (let i = 0; i < 3; i++) {
                el.click();
            }

            assertEqual(count, 3);

            body.removeChild(el);
        });
        it("should work for inc/dec/reset example", () => {
            const counter = (): DOMElementSpec => {
                let count = 0;
                let displayText = createElement(`${count}`);
                const display = createElement([
                    "span",
                    { id: "display" },
                    [displayText],
                ]);
                const updateDisplay = () => {
                    const newDisplayText = createElement(`${count}`);
                    display.replaceChild(newDisplayText, displayText);
                    displayText = newDisplayText;
                };

                return [
                    "div",
                    [
                        display,
                        [
                            "div",
                            { style: { display: "flex" } },
                            [
                                [
                                    "button",
                                    {
                                        id: "dec-btn",
                                        onclick: () => {
                                            count--;
                                            updateDisplay();
                                        },
                                    },
                                    ["Decrement"],
                                ],
                                [
                                    "button",
                                    {
                                        id: "reset-btn",
                                        onclick: () => {
                                            count = 0;
                                            updateDisplay();
                                        },
                                    },
                                    ["Reset"],
                                ],
                                [
                                    "button",
                                    {
                                        id: "inc-btn",
                                        onclick: () => {
                                            count++;
                                            updateDisplay();
                                        },
                                    },
                                    ["Increment"],
                                ],
                            ],
                        ],
                    ],
                ];
            };

            const body = document.getElementsByTagName("body")[0];
            const counterEl = createElement(counter);
            body.appendChild(counterEl);
            const displayEl = document.getElementById("display");
            const incBtnEl = document.getElementById("inc-btn");
            const resetBtnEl = document.getElementById("reset-btn");
            const decBtnEl = document.getElementById("dec-btn");

            assertEqual(displayEl?.innerHTML, "0");
            incBtnEl?.click();
            assertEqual(displayEl?.innerHTML, "1");
            incBtnEl?.click();
            incBtnEl?.click();
            assertEqual(displayEl?.innerHTML, "3");
            decBtnEl?.click();
            decBtnEl?.click();
            decBtnEl?.click();
            decBtnEl?.click();
            decBtnEl?.click();
            assertEqual(displayEl?.innerHTML, "-2");
            resetBtnEl?.click();
            assertEqual(displayEl?.innerHTML, "0");
            decBtnEl?.click();
            incBtnEl?.click();
            incBtnEl?.click();
            assertEqual(displayEl?.innerHTML, "1");

            body.removeChild(counterEl);
        });
        it("should work with the examples from the README", () => {
            const textNode = createElement("text");
            const emptyElement = createElement(["div"]);
            const elementWithChildren = createElement([
                "ol",
                [
                    ["li", ["item 1."]],
                    ["li", ["item 2."]],
                ],
            ]);
            const elementWithAttributes = createElement([
                "canvas",
                { width: 100, height: "100px" },
            ]);
            const styleAttributeCanBeAnObject = createElement([
                "span",
                {
                    style: {
                        color: "hotpink",
                        "font-family": "Comic Sans",
                    },
                },
                ["beautiful text"],
            ]);
            const elementWithEventListener = createElement([
                "button",
                {
                    onclick: () => alert("I'm sorry, Dave."),
                },
                ["Decline Cookies"],
            ]);
            const nativeElementPassthrough = createElement(
                document.createTextNode("test"),
            );
        });
    });
    describe("rerenderOnValueChange", () => {
        it("should work for counter example", () => {
            const createCounter = (
                count: number | ReactiveValue<number>,
            ): {
                count: ReactiveValue<number>;
                el: Element;
            } => {
                const reactiveCount =
                    typeof count === "number"
                        ? readWriteReactiveValue<number>(
                              count,
                              ["validate", "ge-10", (value) => value >= -10],
                              ["validate", "le-10", (value) => value <= 10],
                              ["transform", "mul", (value) => value * 100],
                              ["transform", "mul", (value) => value * 10],
                          )
                              .logErr()
                              .ifErrThrow()
                        : count;

                const el = createElement([
                    "div",
                    [
                        reactiveElement(reactiveCount, (count) => [
                            "span",
                            ["Count: ", count.toString()],
                        ]).element,
                        [
                            "div",
                            [
                                [
                                    "button",
                                    {
                                        onclick: () =>
                                            reactiveCount
                                                .update((count) => --count)
                                                .logErr(),
                                    },
                                    ["Decrement"],
                                ],
                                [
                                    "button",
                                    {
                                        onclick: () =>
                                            reactiveCount.set(0).logErr(),
                                    },
                                    ["Reset"],
                                ],
                                [
                                    "button",
                                    {
                                        onclick: () =>
                                            reactiveCount
                                                .update((count) => ++count)
                                                .logErr(),
                                    },
                                    ["Increment"],
                                ],
                            ],
                        ],
                    ],
                ]);

                return { el, count: reactiveCount.readOnlyRef() };
            };

            const body = document.getElementsByTagName("body")[0];

            const { el: counterEl, count } = createCounter(0);
            count
                .set(10)
                .mapOk("test" as "test")
                .mapErr(["test" as "test", "new msg"])
                .logErr()
                .logOk();
            body.appendChild(counterEl);
            body.appendChild(
                reactiveElement(count, (count) => [
                    "span",
                    ["Double count: ", (2 * count).toString()],
                ]).element,
            );
        });
    });
}

// Test Machinery
// ==============

let assertionSuccessCount = 0;
let assertionFailureCount = 0;
let testSuccessCount = 0;
let testFailureCount = 0;
let testStatusStack: ("success" | "failure")[] = ["success"];
const errors: Error[] = [];
let logIndent = 0;

const failCurrentTest = () => {
    const stackSize = testStatusStack.length;
    testStatusStack.length = 0;
    for (let i = 0; i < stackSize; i++) {
        testStatusStack.push("failure");
    }
};

const logBuffer: {
    condition: "always" | "onTestFailure";
    type: "info" | "success" | "failure";
    msg: string;
}[] = [];

function flushLog() {
    const testStatus = testStatusStack[testStatusStack.length - 1];
    const logEl = document.getElementById("log");
    logEl?.setAttribute("class", "log");

    const lines: string[] = [];

    for (const entry of logBuffer) {
        if (testStatus === "failure" && entry.condition === "onTestFailure") {
            continue;
        }

        let consoleMeth: (msg: string) => unknown;
        let cssClass: string;
        switch (entry.type) {
            case "success":
                consoleMeth = console.log;
                cssClass = "log-line log-line--success";
                break;
            case "failure":
                consoleMeth = console.error;
                cssClass = "log-line log-line--failure";
                break;
            default:
                consoleMeth = console.log;
                cssClass = "log-line";
                break;
        }
        consoleMeth(entry.msg);

        if (logEl !== null) {
            const lineEl = document.createElement("pre");
            lineEl.appendChild(document.createTextNode(entry.msg));
            lineEl.setAttribute("class", cssClass);
            logEl.appendChild(lineEl);
        }

        lines.push(entry.msg);
    }
    // Clear buffer
    logBuffer.length = 0;

    return lines.join("\n");
}

function log(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "info",
        msg: msg
            .split("\n")
            .map((line) => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    });
}

function logOnFailure(msg: string) {
    logBuffer.push({
        condition: "onTestFailure",
        type: "info",
        msg: msg
            .split("\n")
            .map((line) => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    });
}

function logSuccess(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "success",
        msg: msg
            .split("\n")
            .map((line) => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    });
}

function logFailure(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "failure",
        msg: msg
            .split("\n")
            .map((line) => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    });
}

function assertEqual<T>(
    a: any,
    b: any,
    msg: string = "Values should be equal",
) {
    const stringReprA = JSON.stringify(a);
    const stringReprB = JSON.stringify(b);
    const areEqual = a === b && stringReprA === stringReprB;
    if (areEqual) {
        assertionSuccessCount++;
    } else {
        logFailure(`Failed: ${msg}`);
        logFailure(`    ${stringReprA}`);
        logFailure(`    !==`);
        logFailure(`    ${stringReprB}`);
        assertionFailureCount++;
        failCurrentTest();
    }
}

function assertTrue(x: any, msg: string = "Value should be true") {
    if (x === true) {
        assertionSuccessCount++;
    } else {
        logFailure(`Failed: ${msg}`);
        logFailure(`    ${JSON.stringify(x)}`);
        logFailure(`    !==`);
        logFailure(`    true`);
        assertionFailureCount++;
        failCurrentTest();
    }
}

function assertFalse(x: any, msg: string = "Value should be false") {
    if (x === false) {
        assertionSuccessCount++;
    } else {
        logFailure(`Failed: ${msg}`);
        logFailure(`    ${JSON.stringify(x)}`);
        logFailure(`    !==`);
        logFailure(`    false`);
        assertionFailureCount++;
        failCurrentTest();
    }
}

function assertNull(x: any, msg: string = "Value should be null") {
    if (x === false) {
        assertionSuccessCount++;
    } else {
        logFailure(`Failed: ${msg}`);
        logFailure(`    ${JSON.stringify(x)}`);
        logFailure(`    !==`);
        logFailure(`    null`);
        assertionFailureCount++;
        failCurrentTest();
    }
}

function assertConsoleLog(callback: () => unknown, expectedMsg?: string) {
    assertConsoleOutput(callback, "log", expectedMsg);
}

function assertConsoleError(callback: () => unknown, expectedMsg?: string) {
    assertConsoleOutput(callback, "error", expectedMsg);
}

function assertConsoleOutput(
    callback: () => unknown,
    expectedConsoleMethod: "log" | "error" | "debug",
    expectedMsg?: string,
) {
    let consoleMsg: string | null = null;
    const tempConsoleMethod = (msg: string) => (consoleMsg = msg);
    const realConsoleMethod = console[expectedConsoleMethod];
    console[expectedConsoleMethod] = tempConsoleMethod;

    try {
        callback();

        let succeeded = false;
        if (typeof expectedMsg === "undefined") {
            succeeded = consoleMsg !== null;
        } else {
            succeeded = consoleMsg === expectedMsg;
        }

        if (succeeded) {
            assertionSuccessCount++;
        } else {
            if (consoleMsg === null) {
                logFailure(
                    `Failure: No ${expectedConsoleMethod} message was logged by console`,
                );
            } else {
                logFailure(
                    `Failure: Output of \`console.${expectedConsoleMethod}\` did not match expected`,
                );
                logFailure(`    "${consoleMsg}"`);
                logFailure(`    !==`);
                logFailure(`    ${expectedMsg}`);
            }
            assertionFailureCount++;
            failCurrentTest();
        }
    } catch (err) {
        console[expectedConsoleMethod] = realConsoleMethod;
        throw err;
    }

    console[expectedConsoleMethod] = realConsoleMethod;
}

function assertNoConsoleLog(callback: () => unknown, unexpectedMsg?: string) {
    assertNoConsoleOutput(callback, "log", unexpectedMsg);
}

function assertNoConsoleError(callback: () => unknown, unexpectedMsg?: string) {
    assertNoConsoleOutput(callback, "error", unexpectedMsg);
}

function assertNoConsoleOutput(
    callback: () => unknown,
    unexpectedConsoleMethod: "log" | "error" | "debug",
    unexpectedMsg?: string,
) {
    let consoleMsg: string | null = null;
    const tempConsoleMethod = (msg: string) => (consoleMsg = msg);
    const realConsoleMethod = console[unexpectedConsoleMethod];
    console[unexpectedConsoleMethod] = tempConsoleMethod;

    try {
        callback();

        let succeeded = false;
        if (typeof unexpectedMsg === "undefined") {
            succeeded = consoleMsg === null;
        } else {
            succeeded = consoleMsg !== unexpectedMsg;
        }

        if (succeeded) {
            assertionSuccessCount++;
        } else {
            if (consoleMsg === null) {
                logFailure(
                    `Failure: An unexpected ${unexpectedConsoleMethod} message was logged by console`,
                );
            } else {
                logFailure(
                    `Failure: Output of \`console.${unexpectedConsoleMethod}\` should not match`,
                );
                logFailure(`    "${consoleMsg}"`);
                logFailure(`    ===`);
                logFailure(`    ${unexpectedMsg}`);
            }
            assertionFailureCount++;
            failCurrentTest();
        }
    } catch (err) {
        console[unexpectedConsoleMethod] = realConsoleMethod;
        throw err;
    }

    console[unexpectedConsoleMethod] = realConsoleMethod;
}

function describe(
    description: string | string[],
    callback: () => unknown,
    onSuccess: () => void = () => {},
    onFailure: () => void = () => {},
) {
    testStatusStack.push("success");
    logIndent += 4;
    const currentLogIndex = logBuffer.length;

    try {
        callback();
    } catch (err) {
        logFailure("Unexpected Error:");
        logIndent += 4;
        logFailure(err.toString());
        logIndent -= 4;
        failCurrentTest();
        errors.push(err);
    }

    const status = testStatusStack.pop();
    if (status === "success") {
        onSuccess();
    } else {
        onFailure();
    }

    let descriptionLines: string[];
    if (typeof description === "string") {
        descriptionLines = description.split("\n");
    } else {
        descriptionLines = [];
        for (const item of description) {
            descriptionLines.push(...item.split("\n"));
        }
    }
    const msg = [
        `${" ".repeat(logIndent - 4)}${status === "success" ? "✔" : "✘"} ${
            descriptionLines[0]
        }`,
        ...descriptionLines
            .slice(1)
            .map((line) => `${" ".repeat(logIndent - 4)}  ${line}`),
    ].join("\n");
    logBuffer.splice(currentLogIndex, 0, {
        condition: "always",
        type: status || "failure",
        msg,
    });
    logIndent -= 4;
}

function it(should: string | string[], callback: () => unknown) {
    let description: string | string[];
    if (typeof should === "string") {
        description = `it ${should}`;
    } else {
        description = [`it ${should[0]}`, ...should.slice(1)];
    }

    describe(
        description,
        callback,
        () => testSuccessCount++,
        () => testFailureCount++,
    );
}

// Execution
// =========

log("-".repeat(70));
log(new Date().toISOString());
log("-".repeat(70));

test();

log("-".repeat(70));

const status = testStatusStack.pop();
const totalAssertionCount = assertionSuccessCount + assertionFailureCount;
const totalTestCount = testSuccessCount + testFailureCount;

if (status === "success") {
    logSuccess("Tests succeeded:");
} else {
    logFailure("Tests failed:");
}
if (totalTestCount === testSuccessCount) {
    logSuccess(
        `    All ${testSuccessCount}/${totalTestCount} tests succeeded :)`,
    );
} else {
    logFailure(`    ${testFailureCount}/${totalTestCount} tests failed :(`);
    logSuccess(`    ${testSuccessCount}/${totalTestCount} tests succeeded`);
}
if (totalAssertionCount === assertionSuccessCount) {
    logSuccess(
        `    All ${assertionSuccessCount}/${totalAssertionCount} assertions succeeded :)`,
    );
} else {
    logFailure(
        `    ${assertionFailureCount}/${totalAssertionCount} assertions failed :(`,
    );
    logSuccess(
        `    ${assertionSuccessCount}/${totalAssertionCount} assertions succeeded`,
    );
}

log("-".repeat(70));

// Used by a <script> from the HTML that the watch server generates
// so it can be sent to the server and displayed in the command line.
export const logText = flushLog();

if (errors.length > 0) {
    throw errors[0];
}
