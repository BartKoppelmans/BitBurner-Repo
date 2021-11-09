const doc = eval('document');
/**
 * A helper function that ensures we won't work with null values
 */
function nonNull(val, fallback) {
    return Boolean(val) ? val : fallback;
}
/**
 * How do we handle children. Children can either be:
 * 1. Calls to DOMcreateElement, returns a Node
 * 2. Text content, returns a Text
 *
 * Both can be appended to other nodes.
 */
function DOMparseChildren(children) {
    return children.map(child => {
        if (typeof child === 'string') {
            return doc.createTextNode(child);
        }
        return child;
    });
}
/**
 * How do we handle regular nodes.
 * 1. We create an element
 * 2. We apply all properties from JSX to this DOM node
 * 3. If available, we append all children.
 */
function DOMparseNode(element, properties, children) {
    const el = doc.createElement(element);
    Object.keys(nonNull(properties, {})).forEach(key => {
        if (key.startsWith('on') && key.toLowerCase() in window) {
            el.addEventListener(key.toLowerCase().substr(2), properties[key]);
        }
        else
            el[key] = properties[key];
    });
    DOMparseChildren(children).forEach(child => {
        el.appendChild(child);
    });
    return el;
}
/**
 * Our entry function.
 * 1. Is the element a function, than it's a functional component.
 *    We call this function (pass props and children of course)
 *    and return the result. We expect a return value of type Node
 * 2. If the element is a string, we parse a regular node
 */
export function DOMcreateElement(element, properties, ...children) {
    if (typeof element === 'function') {
        return element({
            ...nonNull(properties, {}),
            children,
        });
    }
    return DOMparseNode(element, properties, children);
}
