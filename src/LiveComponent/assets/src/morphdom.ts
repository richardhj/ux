import {
cloneHTMLElement,
    setValueOnElement
} from "./dom_utils";
import morphdom from "morphdom";
import { normalizeAttributesForComparison } from "./normalize_attributes_for_comparison";

export function executeMorphdom(
    rootFromElement: HTMLElement,
    rootToElement: HTMLElement,
    modifiedElements: Array<HTMLElement>,
    getElementValue: (element: HTMLElement) => any,
) {
    // make sure everything is in non-loading state, the same as the HTML currently on the page
    morphdom(rootFromElement, rootToElement, {
        getNodeKey: (node: Node) => {
          if (!(node instanceof HTMLElement)) {
              return;
          }

          return node.dataset.liveId;
        },
        onBeforeElUpdated: (fromEl, toEl) => {
            if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) {
                return false;
            }

            // if this field's value has been modified since this HTML was
            // requested, set the toEl's value to match the fromEl
            if (modifiedElements.includes(fromEl)) {
                setValueOnElement(toEl, getElementValue(fromEl))
            }

            // https://github.com/patrick-steele-idem/morphdom#can-i-make-morphdom-blaze-through-the-dom-tree-even-faster-yes
            if (fromEl.isEqualNode(toEl)) {
                // the nodes are equal, but the "value" on some might differ
                // lets try to quickly compare a bit more deeply
                const normalizedFromEl = cloneHTMLElement(fromEl);
                normalizeAttributesForComparison(normalizedFromEl);

                const normalizedToEl = cloneHTMLElement(toEl);
                normalizeAttributesForComparison(normalizedToEl);

                if (normalizedFromEl.isEqualNode(normalizedToEl)) {
                    // don't bother updating
                    return false;
                }
            }

            // avoid updating child components: they will handle themselves
            const controllerName = fromEl.hasAttribute('data-controller') ? fromEl.getAttribute('data-controller') : null;
            if (controllerName
                && controllerName.split(' ').indexOf('live') !== -1
                && fromEl !== rootFromElement
            ) {
                // TODO: add new child logic here
                return false;
            }

            // look for data-live-ignore, and don't update
            return !fromEl.hasAttribute('data-live-ignore');
        },

        onBeforeNodeDiscarded(node) {
            if (!(node instanceof HTMLElement)) {
                // text element
                return true;
            }

            return !node.hasAttribute('data-live-ignore');
        }
    });
}
