// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

function isObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
}

// Returns the result of merging two objects. If a field is specified in both a and b, the value from b takes precedence
// unless both values are objects in which case mergeObjects will be called recursively.
export default function mergeObjects(a, b, path = '.') {
    if (a === null || a === undefined) {
        return b;
    } else if (b === null || b === undefined) {
        return a;
    }

    let result;

    if (isObject(a) && isObject(b)) {
        result = {};

        for (const key of Object.keys(a)) {
            result[key] = mergeObjects(a[key], b[key], path + '.' + key);
        }

        for (const key of Object.keys(b)) {
            if (result.hasOwnProperty(key)) {
                continue;
            }

            result[key] = b[key];
        }
    } else if (isObject(a) || isObject(b)) {
        throw new Error(`Mismatched types: ${path} is an object from one source but not the other`);
    } else {
        result = b;
    }

    return result;
}
