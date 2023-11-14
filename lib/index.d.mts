// DOM Creation
// ============

// TypeScript Doc for .d.ts files: 
//  https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html

// Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element
// Extracted via JavaScript console:
// ```js
// tags = [...new Set(
//    Array.from(document.querySelectorAll("td code"))
//    .map(el => el.innerHTML)
//    .filter(el => el.startsWith("&lt;") && el.endsWith("&gt;"))
//    .map(el => el.slice(4, el.length - 4))
// )]
// lines = []
// for (const tag of tags) {
//    lines.push(`| "${tag}"`)
// }
// console.log(lines.join("\n"))  
// ```
// Was manually checked.
// TODO: Make ordering consistent.
type HTMLTagName =
    "html"
    | "base"
    | "head"
    | "link"
    | "meta"
    | "script"
    | "style"
    | "title"
    | "body"
    | "address"
    | "article"
    | "aside"
    | "footer"
    | "header"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "hgroup"
    | "main"
    | "nav"
    | "section"
    | "search"
    | "blockquote"
    | "cite"
    | "dd"
    | "dt"
    | "dl"
    | "div"
    | "figcaption"
    | "figure"
    | "hr"
    | "li"
    | "ol"
    | "ul"
    | "menu"
    | "p"
    | "pre"
    | "a"
    | "abbr"
    | "b"
    | "bdi"
    | "bdo"
    | "br"
    | "code"
    | "data"
    | "time"
    | "dfn"
    | "em"
    | "i"
    | "kbd"
    | "mark"
    | "q"
    | "rp"
    | "ruby"
    | "rt"
    | "s"
    | "samp"
    | "small"
    | "span"
    | "strong"
    | "sub"
    | "sup"
    | "u"
    | "var"
    | "wbr"
    | "area"
    | "audio"
    | "img"
    | "map"
    | "track"
    | "video"
    | "embed"
    | "iframe"
    | "object"
    | "picture"
    | "source"
    | "portal"
    | "svg"
    | "math"
    | "canvas"
    | "noscript"
    | "del"
    | "ins"
    | "caption"
    | "col"
    | "colgroup"
    | "table"
    | "tbody"
    | "tr"
    | "td"
    | "tfoot"
    | "th"
    | "thead"
    | "button"
    | "datalist"
    | "option"
    | "fieldset"
    | "label"
    | "form"
    | "input"
    | "legend"
    | "meter"
    | "optgroup"
    | "select"
    | "output"
    | "progress"
    | "textarea"
    | "details"
    | "summary"
    | "dialog"
    | "slot"
    | "template"
    | "acronym"
    | "big"
    | "center"
    | "content"
    | "dir"
    | "font"
    | "frame"
    | "frameset"
    | "image"
    | "marquee"
    | "menuitem"
    | "nobr"
    | "noembed"
    | "noframes"
    | "param"
    | "plaintext"
    | "rb"
    | "rtc"
    | "shadow"
    | "strike"
    | "tt"
    | "xmp"

export type DOMElementName<
    TagName extends string = HTMLTagName
> = TagName

export interface WithToString {
    toString(): string,
}

// TODO: 
// 1. Figure out for which versions of TypeScript which events are supported.
// 2. Consider creating a cut-down version with only the most common 
//    and/or non-conflicting events.
export type AnyEvent =
    Event
    // Source: https://developer.mozilla.org/en-US/docs/Web/API/Event#interfaces_based_on_event
    & AnimationEvent
    & AudioProcessingEvent
    & BeforeUnloadEvent
    & BlobEvent
    & ClipboardEvent
    & CloseEvent
    & CompositionEvent
    & CustomEvent
    & DeviceMotionEvent
    & DeviceOrientationEvent
    & DragEvent
    & ErrorEvent
    // & FetchEvent -- Not recognized by my editor's type checker
    & FocusEvent
    & FontFaceSetLoadEvent
    & FormDataEvent
    & GamepadEvent
    & HashChangeEvent
    // & HIDInputReportEvent -- Not recognized by my editor's type checker
    & IDBVersionChangeEvent
    & InputEvent
    & KeyboardEvent
    // & MediaStreamEvent -- Not recognized by my editor's type checker
    & MessageEvent
    & MouseEvent
    & MutationEvent
    & OfflineAudioCompletionEvent
    & PageTransitionEvent
    & PaymentRequestUpdateEvent
    & PointerEvent
    & PopStateEvent
    & ProgressEvent
    & RTCDataChannelEvent
    & RTCPeerConnectionIceEvent
    & StorageEvent
    & SubmitEvent
    // & SVGEvent -- Not recognized by my editor's type checker
    // & TimeEvent -- Not recognized by my editor's type checker
    & TouchEvent
    & TrackEvent
    & TransitionEvent
    & UIEvent
    & WebGLContextEvent
    & WheelEvent

export type DOMEventHandler<
    Event_ = AnyEvent,
> = (event: Event_) => unknown

// Source: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
type TouchDOMEventHandlers = {
    ontouchstart: DOMEventHandler<TouchEvent>,
    ontouchend: DOMEventHandler<TouchEvent>,
    ontouchcancel: DOMEventHandler<TouchEvent>,
    ontouchmove: DOMEventHandler<TouchEvent>,
}

// Sources: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
type MouseDOMEventHandlers = {
    ondbclick: DOMEventHandler<MouseEvent>,
    onmousedown: DOMEventHandler<MouseEvent>,
    onmouseenter: DOMEventHandler<MouseEvent>,
    onmouseleave: DOMEventHandler<MouseEvent>,
    onmousemove: DOMEventHandler<MouseEvent>,
    onmouseout: DOMEventHandler<MouseEvent>,
    onmouseover: DOMEventHandler<MouseEvent>,
}

// Sources:
//  https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
//  https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event
type PointerDOMEventHandlers = {
    onclick: DOMEventHandler<PointerEvent>,
    onpointerover: DOMEventHandler<PointerEvent>,
    onpointerenter: DOMEventHandler<PointerEvent>,
    onpointerdown: DOMEventHandler<PointerEvent>,
    onpointermove: DOMEventHandler<PointerEvent>,
    onpointerrawupdate: DOMEventHandler<PointerEvent>,
    onpointerup: DOMEventHandler<PointerEvent>,
    onpointercancel: DOMEventHandler<PointerEvent>,
    onpointerout: DOMEventHandler<PointerEvent>,
    onpointerleave: DOMEventHandler<PointerEvent>,
    ongotpointercapture: DOMEventHandler<PointerEvent>,
    onlostpointercapture: DOMEventHandler<PointerEvent>,
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/DragEvent
type DragDOMEventHandlers = {
    ondrag: DOMEventHandler<DragEvent>,
    ondragend: DOMEventHandler<DragEvent>,
    ondragenter: DOMEventHandler<DragEvent>,
    ondragleave: DOMEventHandler<DragEvent>,
    ondragover: DOMEventHandler<DragEvent>,
    ondragstart: DOMEventHandler<DragEvent>,
    ondrop: DOMEventHandler<DragEvent>,
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent
type FocusDOMEventHandlers = {
    onfocus: DOMEventHandler<FocusEvent>,
    onblur: DOMEventHandler<FocusEvent>,
    onfocusin: DOMEventHandler<FocusEvent>,
    onfocusout: DOMEventHandler<FocusEvent>,
}

// Sources:
//  https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/input_event
//  https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event
type EditDOMEventHandlers = {
    oninput: DOMEventHandler<InputEvent>,
    onchange: DOMEventHandler<Event>,
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
type KeyboardDOMEventHandlers = {
    onkeydown: DOMEventHandler<KeyboardEvent>,
    onkeypress: DOMEventHandler<KeyboardEvent>,
    onkeyup: DOMEventHandler<KeyboardEvent>,
}

type MiscDOMEventHandlers = {
    [name: `on${string}`]: DOMEventHandler<AnyEvent>,
}

type DOMEventHandlers =
    TouchDOMEventHandlers
    & MouseDOMEventHandlers
    & PointerDOMEventHandlers
    & FocusDOMEventHandlers
    & EditDOMEventHandlers
    & KeyboardDOMEventHandlers
    & MiscDOMEventHandlers

export type DOMElementAttributes<
    ExtraValues extends WithToString = WithToString,
> =
    {
        class?: string,
        classes?: string[],
        style?: 
            {[name: string]: WithToString} 
            | string,
    }
    & Partial<DOMEventHandlers> 
    | Partial<{[name: string]: ExtraValues}>


export type DOMElementSpec<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName,
    ChildExtraAttributeValue extends WithToString = WithToString,
> = 
    [
        DOMElementName<TagName>, 
        DOMElementAttributes<ExtraAttributeValue>, 
        DOMElementChildren<ChildTagName, ChildExtraAttributeValue>,
    ]
    | [
        DOMElementName<TagName>, 
        DOMElementChildren<ChildTagName, ChildExtraAttributeValue>,
    ]
    | [
        DOMElementName<TagName>, 
        DOMElementAttributes<ExtraAttributeValue>,
    ]
    | [DOMElementName<TagName>]

export type DOMTextNodeSpec = string

export type DOMNodeSpec<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
> =
    DOMElementSpec<
        TagName, 
        ExtraAttributeValue,
        ChildTagName,
        ChildExtraAttributeValue
    >
    | DOMTextNodeSpec
    | LazyDOMElementSpec
    | Node

export type LazyDOMElementSpec<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
> = () => DOMElementSpec<
    TagName,
    ExtraAttributeValue,
    ChildTagName,
    ChildExtraAttributeValue
>

export type DOMElementChildren<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
> = DOMNodeSpec<
    TagName, 
    ExtraAttributeValue,
    ChildTagName,
    ChildExtraAttributeValue
>[]

export type DOMNodeCreator<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
> = ((spec: string) => Node) & (
    (
        spec: DOMNodeSpec<
            TagName,
            ExtraAttributeValue,
            ChildTagName,
            ChildExtraAttributeValue
        >
    ) => Element
) 

export function createElement(spec: string): Node
export function createElement<
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
>(spec: Parameters<DOMNodeCreator<
    TagName,
    ExtraAttributeValue,
    ChildTagName,
    ChildExtraAttributeValue
>>[0]): ReturnType<DOMNodeCreator<
    TagName,
    ExtraAttributeValue,
    ChildTagName,
    ChildExtraAttributeValue
>>


// Values
// ======

export interface Reactive<T> {
    isReadOnly(): boolean
    isWritable(): boolean
    refAsReadOnly(): ReactiveValue<T>
    subscribe(onChange: (value: T) => unknown): (() => void)
}

export interface ReactiveValue<T> extends Reactive<T> {
    get(): T
    set(newValue: T): boolean,
    update(transform: (oldValue: T) => T): boolean,
}

export function readOnlyReactiveValue<T>(
    value: T | ReactiveValue<T>
): ReactiveValue<T>

export function readWriteReactiveValue<T>(
    value: T | ReactiveValue<T>
): ReactiveValue<T>

export function reactiveElement<
    T,
    TagName extends string = HTMLTagName,
    ExtraAttributeValue extends WithToString = WithToString,
    ChildTagName extends string = HTMLTagName | TagName,
    ChildExtraAttributeValue extends WithToString = WithToString | ExtraAttributeValue,
>(
    reactiveData: Reactive<T>,
    render: (data: T) => DOMNodeSpec<
        TagName,
        ExtraAttributeValue,
        ChildTagName,
        ChildExtraAttributeValue
    >,
    options?: {
        initialElement?: Node | "fromRender",
    }
): {
    element: Element,
    unsubscribeFromData: ReturnType<Reactive<T>["subscribe"]>
}