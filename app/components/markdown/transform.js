// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-underscore-dangle */

// Add indices to the items of every list
export function addListItemIndices(ast) {
    const walker = ast.walker();

    let e;
    while ((e = walker.next())) {
        if (e.entering) {
            const node = e.node;

            if (node.type === 'list') {
                let i = node.listStart == null ? 1 : node.listStart; // List indices match what would be displayed in the UI

                for (let child = node.firstChild; child; child = child.next) {
                    child.index = i;

                    i += 1;
                }
            }
        }
    }

    return ast;
}

// Take all images, that aren't inside of tables, and move them to be children of the root document node.
// When this happens, their parent nodes are split into two, if necessary, with the version that follows
// the image having its "continue" field set to true to indicate that things like bullet points don't
// need to be rendered.
export function pullOutImages(ast) {
    for (let block = ast.firstChild; block !== null; block = block.next) {
        // Skip tables because we'll render images inside of those as links
        if (block.type === 'table') {
            continue;
        }

        let node = block.firstChild;

        let cameFromChild = false;

        while (node && node !== block) {
            if (node.type === 'image' && node.parent.type !== 'document') {
                pullOutImage(node);
            }

            // Walk through tree to next node
            if (node.firstChild && !cameFromChild) {
                node = node.firstChild;
                cameFromChild = false;
            } else if (node.next) {
                node = node.next;
                cameFromChild = false;
            } else {
                node = node.parent;
                cameFromChild = true;
            }
        }
    }

    return ast;
}

function pullOutImage(image) {
    let parent = image.parent;
    let prev = image.prev;
    let next = image.next;

    // Remove image from its siblings
    if (prev) {
        prev._next = next;
    }
    if (next) {
        next._prev = prev;

        // Since the following text will be on a new line, a preceding space would cause the
        // alignment to be incorrect
        if (next.type === 'text' && next.literal.startsWith(' ')) {
            next.literal = next.literal.substring(1);
        }
    }

    // And from its parents
    if (parent._firstChild === image) {
        // image was the first child (ie prev is null), so the next sibling is now the first child
        parent._firstChild = next;
    }
    if (parent._lastChild === image) {
        // image was the last child (ie next is null), so the previous sibling is now the last child
        parent._lastChild = prev;
    }

    // Split the tree between the previous and next siblings, where the image would've been
    while (parent && parent.type !== 'document') {
        // We only need to split the parent if there's anything on the right of where we're splitting
        // in the current branch
        let parentCopy = null;

        // Split if we have children to the right of the split (next) or if we have any siblings to the
        // right of the parent (parent.next)
        if (next) {
            parentCopy = copyNodeWithoutNeighbors(parent);

            // Set an additional flag so we know not to re-render things like bullet points
            parentCopy.continue = true;

            // Re-assign the children to the right of the split to belong to the copy
            parentCopy._firstChild = next;
            parentCopy._lastChild = getLastSibling(next);

            if (parent._firstChild === next) {
                parent._firstChild = null;
                parent._lastChild = null;
            } else {
                parent._lastChild = prev;
            }

            // And re-assign the parent of all of those to be the copy
            for (let child = parentCopy.firstChild; child; child = child.next) {
                child._parent = parentCopy;
            }

            // Insert the copy as parent's next sibling
            if (parent.next) {
                parent.next._prev = parentCopy;
                parentCopy._next = parent.next;
                parent._next = parentCopy;
            } else /* if (parent.parent.lastChild === parent) */ {
                // Since parent has no next sibling, parent is the last child of its parent, so
                // we need to set the copy as the last child
                parent.parent.lastChild = parentCopy;
            }
        }

        // Change prev and next to no longer be siblings
        if (prev) {
            prev._next = null;
        }

        if (next) {
            next._prev = null;
        }

        // This image is part of a link so include the destination along with it
        if (parent.type === 'link') {
            image.linkDestination = parent.destination;
        }

        // Move up the tree
        next = parentCopy || parent.next;
        prev = parent;
        parent = parent.parent;
    }

    // Re-insert the image now that we have a tree split down to the root with the image's ancestors.
    // Note that parent is the root node, prev is the ancestor of image, and next is the ancestor of the copy

    // Add image to its parent
    image._parent = parent;
    if (next) {
        parent._lastChild = next;
    } else {
        // image is the last child of the root node now
        parent._lastChild = image;
    }

    // Add image to its siblings
    image._prev = prev;
    prev._next = image;

    image._next = next;
    if (next) {
        next._prev = image;
    }

    // The copy still needs its parent set to the root node
    if (next) {
        next._parent = parent;
    }
}

// Copies a Node without its parent, children, or siblings
function copyNodeWithoutNeighbors(node) {
    // commonmark uses classes so it takes a bit of work to copy them
    const copy = Object.assign(Object.create(Reflect.getPrototypeOf(node)), node);

    copy._parent = null;
    copy._firstChild = null;
    copy._lastChild = null;
    copy._prev = null;
    copy._next = null;

    // Deep copy list data since it's an object
    copy._listData = {...node._listData};

    return copy;
}

// Gets the last sibling of a given node
function getLastSibling(node) {
    let sibling = node;

    while (sibling && sibling.next) {
        sibling = sibling.next;
    }

    return sibling;
}
