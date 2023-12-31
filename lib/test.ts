import {
    DOMElementSpec, 
    ReactiveValue, 
    createElement, 
    readWriteReactiveValue, 
    reactiveElement,
    isErr,
} from "./index.js"

function test() {
    describe("createElement", () => {
        it("should create text nodes", () => {
            const el = createElement("test") 
            assertTrue(el instanceof Node)
        })
        it("should create empty elements", () => {
            const el = createElement(["div"])
            assertEqual(el.tagName, "DIV")
            assertTrue(el instanceof Element)
        })
        it("should create elements just with attributes", () => {
            const el = createElement(["canvas", {width: 100, height: "100"}])
            assertEqual(el.tagName, "CANVAS")
            assertTrue(el.hasAttribute("width"))
            assertTrue(el.hasAttribute("height"))
            assertEqual(el.getAttribute("width"), "100")
            assertEqual(el.getAttribute("height"), "100")
        })
        it("should create elements just with children", () => {
            const el = createElement(
                ["ol", [
                    ["li", ["item1"]],
                    ["li", ["item2"]],
                ]]
            )
            assertEqual(el.tagName, "OL")
            assertEqual(el.children[0].tagName, "LI")
            assertEqual(el.children[1].tagName, "LI")
            assertEqual(el.children[0].innerHTML, "item1")
            assertEqual(el.children[1].innerHTML, "item2")
        })
        it("should create elements with attributes and children", () => {
            const el = createElement(
                ["ol", {width: 100, height: "100"}, [
                    ["li", ["item1"]],
                    ["li", ["item2"]],
                ]]
            )
            assertEqual(el.tagName, "OL")
            assertTrue(el.hasAttribute("width"))
            assertTrue(el.hasAttribute("height"))
            assertEqual(el.getAttribute("width"), "100")
            assertEqual(el.getAttribute("height"), "100")
            assertEqual(el.children[0].tagName, "LI")
            assertEqual(el.children[1].tagName, "LI")
            assertEqual(el.children[0].innerHTML, "item1")
            assertEqual(el.children[1].innerHTML, "item2")
        })
        it("should join the classes attribute to class", () => {
            const el = createElement(["div", {classes: ["class1", "class2"]}])
            assertEqual(el.getAttribute("class"), "class1 class2")
            assertEqual(el.classList[0], "class1")
            assertEqual(el.classList[1], "class2")
        })
        it("should serialize the style attribute when passed as an object", () => {
            const el = createElement(
                ["div", {
                    style: {
                        color: "hotpink", 
                        "font-family": "Comic Sans"
                    }
                }, ["beautiful text"]]
            )
            assertEqual(el.getAttribute("style"), "color: hotpink; font-family: Comic Sans")
        })
        it("should add event listeners for attributes starting with 'on'", () => {
            let count = 0 
            const el = createElement(
                ['button', {
                    onclick: () => count++
                }, ["increment"]]
            ) as HTMLButtonElement
            
            const body = document.getElementsByTagName("body")[0]
            body.appendChild(el)
            for (let i = 0; i < 3; i++) {
                el.click()
            }
            
            assertEqual(count, 3)
            
            body.removeChild(el)
        })
        it("should work for inc/dec/reset example", () => {
            const counter = (): DOMElementSpec => {
                let count = 0
                let displayText = createElement(`${count}`)
                const display = createElement(
                    ["span", {id: "display"}, [displayText]]
                )
                const updateDisplay = () => {
                    const newDisplayText = createElement(`${count}`)
                    display.replaceChild(newDisplayText, displayText)
                    displayText = newDisplayText
                }
                
                return ["div", [
                    display,
                    ["div", {style: {"display": "flex"}}, [
                        ["button", {id: "dec-btn",
                            onclick: () => {
                                count--
                                updateDisplay()
                            }
                        }, ["Decrement"]],
                        ["button", {id: "reset-btn",
                            onclick: () => {
                                count = 0
                                updateDisplay()
                            }
                        }, ["Reset"]],
                        ["button", {id: "inc-btn",
                            onclick: () => {
                                count++
                                updateDisplay()
                            }
                        }, ["Increment"]]
                    ]]
                ]]
            }

            const body = document.getElementsByTagName("body")[0]
            const counterEl = createElement(counter)
            body.appendChild(counterEl)
            const displayEl = document.getElementById("display")
            const incBtnEl = document.getElementById("inc-btn")
            const resetBtnEl = document.getElementById("reset-btn")
            const decBtnEl = document.getElementById("dec-btn")

            assertEqual(displayEl?.innerHTML, "0")
            incBtnEl?.click()
            assertEqual(displayEl?.innerHTML, "1")
            incBtnEl?.click()
            incBtnEl?.click()
            assertEqual(displayEl?.innerHTML, "3")
            decBtnEl?.click()
            decBtnEl?.click()
            decBtnEl?.click()
            decBtnEl?.click()
            decBtnEl?.click()
            assertEqual(displayEl?.innerHTML, "-2")
            resetBtnEl?.click()
            assertEqual(displayEl?.innerHTML, "0")
            decBtnEl?.click()
            incBtnEl?.click()
            incBtnEl?.click()
            assertEqual(displayEl?.innerHTML, "1")

            body.removeChild(counterEl)
        })
        it("should work with the examples from the README", () => {
            const textNode = createElement("text")
            const emptyElement = createElement(["div"])
            const elementWithChildren = createElement(
                ["ol", [
                    ["li", ["item 1."]],
                    ["li", ["item 2."]],
                ]]
            )
            const elementWithAttributes = createElement(
                ["canvas", {width: 100, height: "100px"}]
            )
            const styleAttributeCanBeAnObject = createElement(
                ["span", {style: {
                    color: "hotpink", 
                    "font-family": "Comic Sans",
                }}, ["beautiful text"]]
            )
            const elementWithEventListener = createElement(
                ["button", {
                    onclick: () => alert("I'm sorry, Dave.")
                }, ["Decline Cookies"]]
            )
            const nativeElementPassthrough = createElement(
                document.createTextNode("test")
            )
        })
    })
    describe("rerenderOnValueChange", () => {
        it("should work for counter example", () => {
            const createCounter = (
                count: number | ReactiveValue<number>,
            ): {
                count: ReactiveValue<number>,
                el: Element,
            } => {
                const reactiveCount =
                    typeof count === "number"
                        ? readWriteReactiveValue<number>(
                            count, 
                            ["validate", "ge-10", (value) => value >= -10],
                            ["validate", "le-10", (value) => value <= 10],
                            ["transform", "mul", (value) => value*100],
                            ["transform", "mul", (value) => value*10],
                        ).logErr().ifErrThrow()
                        : count

                const el = createElement(
                    ["div", [
                        reactiveElement(
                            reactiveCount,
                            (count) => ["span", ["Count: ", count.toString()]]
                        ).element,
                        ["div", [
                            ["button", {
                                onclick: () => reactiveCount.update(count => --count).logErr()
                            }, ["Decrement"]],
                            ["button", {
                                onclick: () => reactiveCount.set(0).logErr()
                            }, ["Reset"]],
                            ["button", {
                                onclick: () => reactiveCount.update(count => ++count).logErr()
                            }, ["Increment"]],
                        ]]
                    ]]
                )

                return {el, count: reactiveCount.readOnlyRef()}
            }

            const body = document.getElementsByTagName("body")[0]

            const {el: counterEl, count} = createCounter(0)
            count.set(10)
                .mapOk("test" as "test")
                .mapErr(["test" as "test", "new msg"])
                .logErr()
                .logOk()
            body.appendChild(counterEl)
            body.appendChild(reactiveElement(
                count,
                (count) => ["span", ["Double count: ", (2*count).toString()]]
            ).element)
        })
    })
}

// Test Machinery
// ==============

let assertionSuccessCount = 0
let assertionFailureCount = 0
let testSuccessCount = 0
let testFailureCount = 0
let testStatusStack: ("success" | "failure")[] = ["success"]
const errors: Error[] = []
let logIndent = 0

const failCurrentTest = () => {
    const stackSize = testStatusStack.length
    testStatusStack.length = 0
    for (let i = 0; i < stackSize; i++) {
        testStatusStack.push("failure")
    }
}

const logBuffer: {
    condition: "always" | "onTestFailure",
    type: "info" | "success" | "failure",
    msg: string,
}[] = []

function flushLog() {
    const testStatus = testStatusStack[testStatusStack.length - 1]
    const logEl = document.getElementById("log")

    for (const entry of logBuffer) {
        if (
            testStatus === "failure" 
            && entry.condition === "onTestFailure"
        ) {
            continue
        }

        let consoleMeth: (msg: string) => unknown
        let backgroundColor: string
        switch (entry.type) {
            case "success":
                consoleMeth = console.log
                backgroundColor = "#aee"
                break
            case "failure":
                consoleMeth = console.error
                backgroundColor = "#eaa"
                break
            default:
                consoleMeth = console.log
                backgroundColor = "#fff"
                break
        }

        consoleMeth(entry.msg)
        if (logEl !== null) {
            const lineEl = document.createElement("pre")
            lineEl.appendChild(document.createTextNode(entry.msg))
            lineEl.setAttribute("style", `background:${backgroundColor};padding:0;margin:0`)
            logEl.appendChild(lineEl)
        }
    }
    // Clear buffer
    logBuffer.length = 0
}

function log(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "info",
        msg: msg
            .split("\n")
            .map(line => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    })
}

function logOnFailure(msg: string) {
    logBuffer.push({
        condition: "onTestFailure",
        type: "info",
        msg: msg
            .split("\n")
            .map(line => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    })
}

function logSuccess(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "success",
        msg: msg
            .split("\n")
            .map(line => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    })
}

function logFailure(msg: string) {
    logBuffer.push({
        condition: "always",
        type: "failure",
        msg: msg
            .split("\n")
            .map(line => `${" ".repeat(logIndent)}${line}`)
            .join("\n"),
    })
}

function assertEqual<T>(
    a: any, 
    b: any,
    msg: string = "Values should be equal",
) {
    const stringReprA = JSON.stringify(a)
    const stringReprB = JSON.stringify(b)
    const areEqual = a === b && stringReprA === stringReprB
    if (areEqual) {
        assertionSuccessCount++
    } else {
        logFailure(`Failed: ${msg}`)
        logFailure(`    ${stringReprA}`)
        logFailure(`    !==`)
        logFailure(`    ${stringReprB}`)
        assertionFailureCount++
        failCurrentTest()
    }
}

function assertTrue(
    x: any,
    msg: string = "Value should be true",
) {
    if (x === true) {
        assertionSuccessCount++
    } else {
        logFailure(`Failed: ${msg}`)
        logFailure(`    ${JSON.stringify(x)}`)
        logFailure(`    !==`)
        logFailure(`    true`)
        assertionFailureCount++
        failCurrentTest()
    }
}

function assertFalse(
    x: any,
    msg: string = "Value should be false",
) {
    if (x === false) {
        assertionSuccessCount++
    } else {
        logFailure(`Failed: ${msg}`)
        logFailure(`    ${JSON.stringify(x)}`)
        logFailure(`    !==`)
        logFailure(`    false`)
        assertionFailureCount++
        failCurrentTest()
    }
}

function assertNull(
    x: any,
    msg: string = "Value should be null",
) {
    if (x === false) {
        assertionSuccessCount++
    } else {
        logFailure(`Failed: ${msg}`)
        logFailure(`    ${JSON.stringify(x)}`)
        logFailure(`    !==`)
        logFailure(`    null`)
        assertionFailureCount++
        failCurrentTest()
    }
}

function describe(
    description: string, 
    callback: () => unknown,
    onSuccess: () => void = () => {},
    onFailure: () => void = () => {},
) {
    testStatusStack.push("success")
    logIndent += 4
    const currentLogIndex = logBuffer.length

    try {
        callback()
    } catch(err) {
        logFailure("Unexpected Error:")
        logIndent += 4
        logFailure(err.toString())
        logIndent -= 4
        failCurrentTest()
        errors.push(err)
    }

    const status = testStatusStack.pop()
    if (status === "success") {
        onSuccess()
    } else {
        onFailure()
    }
    logBuffer.splice(currentLogIndex, 0, {
        condition: "always",
        type: status || "failure",
        msg: `${" ".repeat(logIndent - 4)}${status === "success" ? "✔" : "✘"} ${description}`
    })
    logIndent -= 4
}

function it(should: string, callback: () => unknown) {
    describe(
        `it ${should}`, 
        callback,
        () => testSuccessCount++,
        () => testFailureCount++,
    )
}


// Execution
// =========

log("-".repeat(70))

test()

log("-".repeat(70))

const status = testStatusStack.pop()
const totalAssertionCount = assertionSuccessCount + assertionFailureCount
const totalTestCount = testSuccessCount + testFailureCount

if (status === "success") {
    logSuccess('Tests succeeded:')
} else {
    logFailure('Tests failed:')
}
if (totalTestCount === testSuccessCount) {
    logSuccess(`    All ${testSuccessCount}/${totalTestCount} tests succeeded :)`)
} else {
    logFailure(`    ${testFailureCount}/${totalTestCount} tests failed :(`)
    logSuccess(`    ${testSuccessCount}/${totalTestCount} tests succeeded`)
}
if (totalAssertionCount === assertionSuccessCount) {
    logSuccess(`    All ${assertionSuccessCount}/${totalAssertionCount} assertions succeeded :)`)
} else {
    logFailure(`    ${assertionFailureCount}/${totalAssertionCount} assertions failed :(`)
    logSuccess(`    ${assertionSuccessCount}/${totalAssertionCount} assertions succeeded`)
}

log("-".repeat(70))

flushLog()

if (errors.length > 0) {
    throw errors[0]
}