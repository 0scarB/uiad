# UIAD - User Interfaces As Data

TBD:
- Short intro:
    - Short description
    - Short Example
- Motivation
- Describe potential use-cases in relation to other technologies

## Creating DOM Elements

`createDOM` can be used to create DOM nodes:

```ts
import {createDOM} from "uiad"

const textNode = createDOM("text")
const emptyElement = createDOM(["div"])
const elementWithChildren = createDOM(
    ["ol", [
        ["li", ["item 1."]],
        ["li", ["item 2."]],
    ]]
)
const elementWithAttributes = createDOM(
    ["canvas", {width: 100, height: "100px"}]
)
const styleAttributeCanBeAnObject = createDOM(
    ["span", {style: {
        color: "hotpink", 
        "font-family": "Comic Sans",
    }}, ["beautiful text"]]
)
const elementWithEventListener = createDOM(
    ["button", {
        onclick: () => alert("I'm sorry, Dave.")
    }, ["Decline Cookies"]]
)
const nativeElementPassthrough = createDOM(
    document.createTextNode("test")
)
```

TBD:
- Add explanation
- Add example for lazy evaluation

## Values

Temporary example:

```ts
const createCounter = (
    count: number | ReactiveValue<number>,
): {
    count: ReactiveValue<number>,
    el: Element,
} => {
    const reactiveCount =
        typeof count === "number"
            ? readWriteReactiveValue(count)
            : count

    const el = createElement(
        ["div", [
            reactiveElement(
                reactiveCount,
                (count) => ["span", ["Count: ", count.toString()]]
            ).element,
            ["div", [
                ["button", {
                    onclick: () => reactiveCount.update(count => --count)
                }, ["Decrement"]],
                ["button", {
                    onclick: () => reactiveCount.set(0)
                }, ["Reset"]],
                ["button", {
                    onclick: () => reactiveCount.update(count => ++count)
                }, ["Increment"]],
            ]]
        ]]
    )

    return {el, count: reactiveCount.refAsReadOnly()}
}

const body = document.getElementsByTagName("body")[0]

const {el: counterEl, count} = createCounter(3)
if (!count.set(10)) {
    console.log("Cant mutate because read only!")
}
body.appendChild(counterEl)
body.appendChild(reactiveElement(
    count,
    (count) => ["span", ["Double count: ", (2*count).toString()]]
).element)
```

TBD:
- Document Read/Write, Read+Write interfaces
- Provide example(s) with the `input` element

## Sequences

TBD:
- Document Read/Write, Read+Write interfaces
- Provide example(s) with `ul`/`ol` elements

## Key/Value Data

TBD:
- Document Read/Write, Read+Write interfaces
- Provide example(s)

## Records

TBD:
- Document Read/Write, Read+Write interfaces
- Provide example(s)

## Versioning

This project follows the same format as sematic versioning: `<major release>.<minor release>.<patch release>`.
Major release will however **be incremented either by `1000` or `1`** for each release.
An increment of `1` means backwards-incompatible changes have been made to the public-facing type definitions,
while an increment of `1000` means that backwards-incompatible changes have been made to the
public-facing JavaScript interface or underlying behavior.

In practice you should consider pinning your versions as explained in the following examples.

> The current version is `4200.1.2`.
>
> Because Alice is coding a new **TypeScript** project 
> and **cares about changes to the type definitions**, 
> she pins the `uiad` dependency version as:
> ```
> "uiad": "4200.x"
> ```
>
> Because Bob is coding a new **(vanilla) JavaScript** project 
> and **does not care about changes to the type definitions**,  
> he pins the `uiad` dependency version as:
> ```
> "uiad": ">=4000.0.0 <5000.0.0"
> ```

### Pre-`1000.0.0`

This project is currently under development and will remain at `0.1.0` until the first stable
release of `1000.0.0`.

### Why?

This versioning scheme is largely compatible with semantic versioning while
encoding more information in the major version number.
Most importantly, the major version always changes when the public
interface changes.

## Development

### Testing

Run `npm i -D` to install multiple versions of TypeScript
that the tests will be compiled with.

`npm run test` inside the `lib` directory should open a test html file
in your browser, displaying descriptions of the tests that were
run and whether they failed or succeeded.

From there `npm run test-gen` can be used to regenerate the html file. The new updated tests will be rerun and the
output will change when you reload the page.

Alternatively, run `npm run test-gen` to generate `test.html` inside of
the `lib` directory and open it in your browser manually.

`npm run test-gen` is reliant on the commands `node` and `bash`
being available from the shell/command line/terminal that you're running
the command in.
