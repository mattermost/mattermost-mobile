// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import DeviceInfo from 'react-native-device-info';
import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';

import {getTranslations} from '@i18n';

type SortByCreatAt = (Session | Channel | Team | Post) & {
    create_at: number;
}

export function getIntlShape(locale = 'en') {
    return createIntl({
        locale,
        messages: getTranslations(locale),
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function emptyFunction(..._args: any[]) {
    // do nothing
}

// Generates a RFC-4122 version 4 compliant globally unique identifier.
export const generateId = (prefix?: string): string => {
    // implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        let v;

        if (c === 'x') {
            v = r;
        } else {
            // eslint-disable-next-line no-mixed-operators
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });

    if (prefix) {
        return `${prefix}-${id}`;
    }

    return id;
};

export function hapticFeedback(method: HapticFeedbackTypes = HapticFeedbackTypes.impactLight) {
    ReactNativeHapticFeedback.trigger(method, {
        enableVibrateFallback: false,
        ignoreAndroidSystemSettings: false,
    });
}

export const sortByNewest = (a: SortByCreatAt, b: SortByCreatAt) => {
    if (a.create_at > b.create_at) {
        return -1;
    }

    return 1;
};

export const isBetaApp = DeviceInfo.getBundleId && DeviceInfo.getBundleId().includes('rnbeta');
