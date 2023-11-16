"use strict"

const LIB_NAME = "uiad"

// Utilities
// =========

class Ok {
    constructor(value) {
        this.ok = value
        this.errKind = null
        this.errMsg = null
    }

    onOk(callback) {
        callback(this.ok)

        return this
    }

    onErr(callback) {
        return this
    }
    
    logOk(...args) {
        switch (args.length) {
            case 0:
                return this.logOk("log", this.ok)
            case 1:
                return this.logOk("log", args[0])
            default:
                const consoleMeth = args[0]
                let msg
                if (typeof args[1] === "function") {
                    msg = args[1](this.ok)
                } else {
                    msg = args[1]
                }
                console[consoleMeth](msg)

                return this
        }
    }
    
    logErr(...args) {
        return this
    }

    mapOk(new_) {
        if (typeof new_ !== "function") {
            return new Ok(new_)
        }

        const returnValue = new_(this.ok)

        if (
            returnValue instanceof Ok
            || returnValue instanceof Err
        ) {
            return returnValue
        }

        return new Ok(returnValue)
    }

    mapErr(callback) {
        return this
    }

    ifErr(valueOnErr) {
        return this.ok
    }

    ifErrThrow(jsError) {
        return this.ok
    }

    toString() {
        return `${LIB_NAME}.Ok(${this.ok})`
    }
}

class Err {
    constructor(kind, msg) {
        this.ok = null
        this.errKind = kind
        this.errMsg = msg
    }

    onOk(callback) {
        return this
    }

    onErr(callback) {
        callback(this.errKind, this.errMsg)

        return this
    }

    logOk(...args) {
        return this
    }

    logErr(...args) {
        switch (args.length) {
            case 0:
                return this.logErr("error", `${this.errKind}: ${this.errMsg}`)
            case 1:
                return this.logErr("error", args[0])
            default:
                const consoleMeth = args[0]
                let msg
                if (typeof args[1] === "function") {
                    msg = args[1](this.errKind, this.errMsg)
                } else {
                    msg = args[1]
                }
                console[consoleMeth](msg)

                return this
        }
    }

    mapOk(callback) {
        return this
    }

    mapErr(new_) {
        switch (typeof new_) {
            case "string":
                return new Err(new_, this.errMsg)
            case "object":
                return new Err(new_[0], new_[1])
        }

        return this.mapErr(new_(this.errKind, this.errMsg))
    }

    ifErr(valueOnErr) {
        return valueOnErr
    }

    ifErrThrow(jsError) {
        switch (typeof jsError) {
            case "undefined":
                throw new Error(`${this.errKind}: ${this.errMsg}`)
            case "function":
                return this.ifErrThrow(
                    jsError(this.errKind, this.errMsg)
                )
        }

        if (jsError instanceof Error) {
            throw new jsError
        }

        throw new Error(jsError)
    }

    toString() {
        return `${LIB_NAME}.Err(${this.errKind}: ${this.errMsg})`
    }
}

export function ok(value) {
    return new Ok(value)
}

export function err(kind, msg) {
    return new Err(kind, msg)
}

export function isOk(result) {
    return result instanceof Ok
}

export function isErr(result) {
    return result instanceof Err
}


// DOM Creation
// ============

export function createElement(spec) {
    switch (typeof spec) {

        case "object":
            
            if (spec instanceof Node) {
                return spec
            }

            // Argument Unpacking
            // ------------------
            const tagName = spec[0]

            // Specifications can be optionally provided 
            // for an elements attributes and children 
            // as the second and third elements of the
            // `spec` array, in one of the following forms:
            //     spec = [<tagName>, <attrSpec:object>, <childrenSpec:array>]
            //     spec = [<tagName>, <attrSpec:object>]
            //     spec = [<tagName>, <childrenSpec:array>]
            //     spec = [<tagName>]
            let attrsSpec
            let childrenSpec
            switch (spec.length) {
                case 3:
                    attrsSpec = spec[1]
                    childrenSpec = spec[2]
                    break
                case 2:
                    if (Array.isArray(spec[1])) {
                        attrsSpec = {}
                        childrenSpec = spec[1]
                    } else {
                        attrsSpec = spec[1]
                        childrenSpec = []
                    }
                    break
                default:
                    attrsSpec = {}
                    childrenSpec = []
                    break
            }

            // DOM Element Creation
            // --------------------
            const el = document.createElement(tagName)

            for (let name in attrsSpec) {
                // Attributes starting with "on" are event handlers.
                // Their function values will registered as event
                // listeners on the element.
                const isEventHandler = name[0] === 'o' && name[1] === 'n'
                if (isEventHandler) {
                    const eventName = name.slice(2)
                    const handler = attrsSpec[name]
                    el.addEventListener(eventName, handler)

                    continue
                }

                const valueSpec = attrsSpec[name]
                let value
                // `classes` is a utility attribute for specifying
                // elements with multiple CSS classes.
                if (name === "classes") {
                    name = "class"
                    value = valueSpec.join(" ")
                } else if (name === "style") {
                    // The `style` attribute may be provided as an
                    // object in which case key-value-pairs are
                    if (typeof valueSpec === "object") {
                        value = createStyleAttributeValue(valueSpec)
                    } else {
                        value = valueSpec
                    }
                } else {
                    value = valueSpec.toString()
                }

                el.setAttribute(name, value)
            }

            for (const childSpec of childrenSpec) {
                const child = createElement(childSpec)
                el.appendChild(child)
            }

            return el
        
        case "string":
            return document.createTextNode(spec)

        case "function":
            const newSpec = spec()
            return createElement(newSpec)
    }

    throw new Error(
        `Cannot create a DOM node from "${JSON.stringify(spec)}"!`
    )
}

function createStyleAttributeValue(spec) {
    const cssRuleStrings = []
    for (const cssProperty in spec) {
        const cssPropertyValue = spec[cssProperty]
        cssRuleStrings.push(`${cssProperty}: ${cssPropertyValue}`)
    }
    return cssRuleStrings.join("; ")
}


// Reactivity
// ==========

const CANNOT_SET_READ_ONLY_REACTIVE_VALUE_ERR = err(
    "CannotSetReadOnly", 
    "Cannot set read-only reactive value!"
)
const CANNOT_UPDATE_READ_ONLY_REACTIVE_VALUE_ERR = err(
    "CannotSetReadOnly", 
    "Cannot update read-only reactive value!"
)
class ReactiveValue {
    // We use the '__' for private properties because
    // builtin support has only recently been integrated by browsers.
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties#browser_compatibility

    constructor(value, isReadOnly, postProcessors) {
        this.__value = value
        this.__isReadOnly = isReadOnly
        if (postProcessors) {
            this.__postProcessors = postProcessors
        }
    }

    _getPostProcessors() {
        return this.__postProcessors
    }

    isReadOnly() {
        return this.__isReadOnly
    }

    isWritable() {
        return !this.__isReadOnly
    }

    get() {
        return this.__value
    }

    set(newValue) {
        if (this.__isReadOnly) {
            return CANNOT_SET_READ_ONLY_REACTIVE_VALUE_ERR
        }

        let postProcessedValue = newValue
        if (this.__postProcessors) {
            for (const postProcessor of this.__postProcessors.values()) {
                const result = postProcessor(postProcessedValue)
                if (isErr(result)) {
                    return result
                }
                postProcessedValue = result.ok
            }
        }

        if (this.__subscriptions) {
            for (const subscription of this.__subscriptions.values()) {
                subscription(postProcessedValue)
            }
        }

        this.__value = newValue
        
        return ok(this)
    }

    update(transform) {
        if (this.__isReadOnly) {
            return CANNOT_UPDATE_READ_ONLY_REACTIVE_VALUE_ERR
        }

        const newValue = transform(this.__value)

        return this.set(newValue)
    }

    readOnlyRef() {
        if (this.__isReadOnly) {
            return this
        }

        return new ReadOnlyReactiveValueRef(this)
    }

    subscribe(onChange) {
        if (!this.__subscriptions) {
            this.__subscriptions = new Map()
            this.__subscriptionId = 0
        }

        const id = this.__subscriptionId

        this.__subscriptions.set(id, onChange)
        this.__subscriptionId++

        const unsubscribe = () => {
            if (!this.__subscriptions || !this.__subscriptions.has(id)) {
                return
            }

            this.__subscriptions.delete(id)

            if (this.__subscriptions.size < 1) {
                delete this.__subscriptions
                delete this.__subscriptionId
            }
        }

        return unsubscribe
    }

    toString() {
        return `${LIB_NAME}.ReactiveValue(${this.__value})`
    }
}

const READ_ONLY_REACTIVE_VALUE_REF_SET_ERR = err(
    "CannotSetReadOnly",
    "Cannot set value of read-only reference!"
)
const READ_ONLY_REACTIVE_VALUE_REF_UPDATE_ERR = err(
    "CannotSetReadOnly",
    "Cannot update value of read-only reference!"
)
class ReadOnlyReactiveValueRef {

    constructor(original) {
        this.__original = original
    }

    _getPostProcessors() {
        return this.__original._getPostProcessors()
    }

    isReadOnly() {
        return true
    }

    isWritable() {
        return false
    }

    get() {
        return this.__original.get()
    }

    set(newValue) {
        return READ_ONLY_REACTIVE_VALUE_REF_SET_ERR
    }

    update(transform) {
        return READ_ONLY_REACTIVE_VALUE_REF_UPDATE_ERR
    }

    refAsReadOnly() {
        return this
    }

    subscribe(onChange) {
        this.__original.subscribe(onChange)
    }

    toString() {
        return `${LIB_NAME}.ReadOnlyReactiveValueRef(${this.__value})`
    }
}

export function readOnlyReactiveValue(
    value, 
    ...postProcessorsSpec
) {
    return createReactiveValue(value, true, postProcessorsSpec)
}

export function readWriteReactiveValue(
    value,
    ...postProcessorsSpec
) {
    return createReactiveValue(value, false, postProcessorsSpec)
}

function createReactiveValue(
    value,
    isReadOnly,
    postProcessorsSpec,
) {
    const isReactiveValue = (
        value instanceof ReactiveValue 
        || value instanceof ReadOnlyReactiveValueRef
    )

    let postProcessors = undefined

    if (isReactiveValue) {
        postProcessors = value._getPostProcessors()
    }

    if (postProcessorsSpec.length > 0) {
        if (typeof postProcessors === "undefined") {
            postProcessors = new Map()
        }

        populatePostProcessorMap(
            postProcessors, 
            postProcessorsSpec
        )
    }

    let reactiveValue
    if (isReactiveValue) {
        reactiveValue =  ReactiveValue(
            value.get(), 
            isReadOnly,
            postProcessors,
        )
    } else {
        reactiveValue = new ReactiveValue(
            value, 
            isReadOnly, 
            postProcessors
        )
    }

    // Force new post-processors to run
    if (postProcessorsSpec.length > 0) {
        const result = reactiveValue.set(reactiveValue.get())
        if (isErr(result)) {
            return result
        }
    }

    return ok(reactiveValue)
}

function populatePostProcessorMap(map, spec) {
    for (const entry of spec) {
        if (entry[0] === '-') {
            const name = entry.slice(1)
            map.delete(name)

            continue
        }

        const [intent, name, func] = entry
        switch (intent) {
            case "validate":
                map.set(
                    name, 
                    (value) => {
                        const validatorResult = func(value)

                        switch (typeof validatorResult) {
                            case "boolean":
                                if (validatorResult) {
                                    return ok(value)
                                }

                                return err(
                                    "Invalid", 
                                    `Value '${value}' is invalid!`
                                )
                            case "string":
                                return err("Invalid", validatorResult)
                            default:
                                const [errKind, errMsg] = validatorResult
                                return err(errKind, errMsg)
                        }
                    }
                )
                break
            case "transform":
                map.set(
                    name,
                    (value) => {
                        const transformationResult = func(value)

                        if (transformationResult instanceof Err) {
                            return transformationResult
                        }

                        return ok(transformationResult)
                    }
                )
                break
            case "postProcess":
                map.set(name, postProcess)
                break
        }
    }
}

export function reactiveElement(
    value,
    render,
    options,
) {
    let element
    if (
        typeof options !== "undefined" 
        && typeof options.initialElement !== "undefined"
        && options.initialElement !== "fromRender"
        && options.initialElement instanceof Node
    ) {
        element = options.initialElement
    } else {
        element = createElement(render(value.get()))
    }
    
    const unsubscribe = value.subscribe((newValue) => {
        const newElement = createElement(render(newValue))

        try {
            element.replaceWith(newElement)
            element = newElement
        } catch(e) {
            // TODO
        }
    })

    return {
        element,
        unsubscribeFromData: unsubscribe,
    }
}
