"use strict"

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