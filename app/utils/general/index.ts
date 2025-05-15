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

// getContrastingSimpleColor returns a contrasting color - either black or white, depending on the luminance
// of the supplied color. Both input and output colors are in hexadecimal color code.
// This function is copied from Mattermost webapp -
// https://github.com/mattermost/mattermost/blob/03d724b6a64dbb7bb41a9491f60d277244a8c488/webapp/channels/src/packages/mattermost-redux/src/utils/theme_utils.ts#L176
export function getContrastingSimpleColor(colorHexCode: string): string {
    const color = colorHexCode.startsWith('#') ? colorHexCode.slice(1) : colorHexCode;

    if (color.length !== 6) {
        return '';
    }

    // split red, green and blue components
    const red = parseInt(color.substring(0, 2), 16);
    const green = parseInt(color.substring(2, 4), 16);
    const blue = parseInt(color.substring(4, 6), 16);

    // calculate relative luminance of each color channel - https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
    const srgb = [red / 255, green / 255, blue / 255];
    const [redLuminance, greenLuminance, blueLuminance] = srgb.map((i) => {
        if (i <= 0.04045) {
            return i / 12.92;
        }
        return Math.pow((i + 0.055) / 1.055, 2.4);
    });

    // calculate luminance of the whole color by adding percieved luminance of each channel
    const colorLuminance = (0.2126 * redLuminance) + (0.7152 * greenLuminance) + (0.0722 * blueLuminance);

    // return black or white based on color's luminance
    // 0.179 is the threshold for black and white contrast - https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio,
    // The exact value was derived empirically by testing the contrast of black and white on various colors
    return colorLuminance > 0.179 ? '#000000' : '#FFFFFF';
}
