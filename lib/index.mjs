"use strict"

// DOM Creation
// ============

export function createDOM(spec) {
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
                const child = createDOM(childSpec)
                el.appendChild(child)
            }

            return el
        
        case "string":
            return document.createTextNode(spec)

        case "function":
            const newSpec = spec()
            return createDOM(newSpec)
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


// Values
// ======

class Value {
    // We use the '__' for private properties because
    // builtin support has only recently been integrated by browsers.
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties#browser_compatibility

    constructor(value, isReadOnly) {
        this.__value = value
        this.__isReadOnly = isReadOnly
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
            return false
        }

        if (this.__subscriptions) {
            for (const subscription of this.__subscriptions.values()) {
                subscription(newValue)
            }
        }

        this.__value = newValue
        
        return true
    }

    refAsReadOnly() {
        if (this.__isReadOnly) {
            return this
        }

        return new ReadOnlyValueRef(this)
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
}

class ReadOnlyValueRef {

    constructor(original) {
        this.__original = original
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
        return false
    }

    refAsReadOnly() {
        return this
    }

    subscribe(onChange) {
        this.__original.subscribe(onChange)
    }
}

export function readOnly(value) {
    if (
        value instanceof Value 
        || value instanceof ReadOnlyValueRef
    ) {
        return new Value(value.get(), true)
    }

    return new Value(value, true)
}

export function readWrite(value) {
    if (
        value instanceof Value 
        || value instanceof ReadOnlyValueRef
    ) {
        return new Value(value.get(), false)
    }

    return new Value(value, false)
}

export function rerenderOnValueChange(
    value,
    parentElement,
    render,
) {
    parentElement = createDOM(parentElement)
    let childElement = createDOM(render(value.get()))

    parentElement.appendChild(childElement)
    
    const unsubscribe = value.subscribe((newValue) => {
        // Remove subscription if the parent element no longer exists
        // or is no longer connected to the document.
        if (!parentElement || !parentElement.isConnected) {
            if (unsubscribe) {
                unsubscribe()
            } else {
                setTimeout(unsubscribe, 10)
            }
            return
        }

        const newChildElement = createDOM(render(newValue))

        parentElement.replaceChild(newChildElement, childElement)

        childElement = newChildElement
    })
}