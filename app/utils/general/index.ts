// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import {randomUUID} from 'expo-crypto';
import {createIntl} from 'react-intl';
import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';

export type SortByCreatAt = (Session | Channel | Team | Post) & {
    create_at: number;
}

export function getIntlShape(locale = DEFAULT_LOCALE) {
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
    const id = randomUUID();
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

export const isBetaApp = applicationId && applicationId.includes('rnbeta');
