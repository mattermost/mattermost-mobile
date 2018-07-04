// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {Posts} from 'mattermost-redux/constants';

export function fromAutoResponder(post) {
    return Boolean(post.type && (post.type === Posts.SYSTEM_AUTO_RESPONDER));
}

export function toTitleCase(str) {
    function doTitleCase(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
    return str.replace(/\w\S*/g, doTitleCase);
}

export function alertErrorWithFallback(intl, error, fallback, values) {
    let msg = error.message;
    if (!msg || msg === 'Network request failed') {
        msg = intl.formatMessage(fallback, values);
    }
    Alert.alert('', msg);
}

export function alertErrorIfInvalidPermissions(result) {
    function isForbidden(data) {
        const {error} = data;
        return error && error.status_code === 403;
    }

    let error = null;
    if (Array.isArray(result)) {
        const item = result.find((r) => isForbidden(r));
        if (item) {
            error = item.error;
        }
    } else if (isForbidden(result)) {
        error = result.error;
    }

    if (error) {
        Alert.alert(error.message);
    }
}

export function emptyFunction() {
    return;
}

export function throttle(fn, limit, ...args) {
    let inThrottle;
    let lastFunc;
    let lastRan;

    return () => {
        if (inThrottle) {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    Reflect.apply(fn, this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        } else {
            Reflect.apply(fn, this, args);
            lastRan = Date.now();
            inThrottle = true;
        }
    };
}

export function isEmail(email) {
    // writing a regex to match all valid email addresses is really, really hard. (see http://stackoverflow.com/a/201378)
    // this regex ensures:
    // - at least one character that is not a space, comma, or @ symbol
    // - followed by a single @ symbol
    // - followed by at least one character that is not a space, comma, or @ symbol
    // this prevents <Outlook Style> outlook.style@domain.com addresses and multiple comma-separated addresses from being accepted
    return (/^[^ ,@]+@[^ ,@]+$/).test(email);
}
