// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, Platform} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
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

export function emptyFunction() { // eslint-disable-line no-empty-function

}

export const showTermsOfServiceModal = (navigator, theme) => {
    MaterialIcon.getImageSource(Platform.OS === 'ios' ? 'chevron-left' : 'arrow-back', Platform.OS === 'ios' ? 32 : 20, theme.sidebarHeaderTextColor).then((source) => {
        navigator.showModal({
            screen: 'TermsOfService',
            animationType: 'slide-up',
            title: '',
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.centerChannelColor,
                navBarBackgroundColor: theme.centerChannelBg,
                navBarButtonColor: theme.buttonBg,
                screenBackgroundColor: theme.buttonColor,
            },
            passProps: {
                closeButton: source,
            },
        });
    });
};

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
