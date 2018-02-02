// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Alert} from 'react-native';

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
