// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config, Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';

import type PreferenceModel from '@typings/database/models/servers/preference';

export function processIsCRTEnabled(preferences: PreferenceModel[]|PreferenceType[], configValue?: string, featureFlag?: string): boolean {
    let preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_OFF;
    if (configValue === Config.DEFAULT_ON) {
        preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_ON;
    }
    const preference = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.COLLAPSED_REPLY_THREADS, preferenceDefault);

    const isAllowed = (
        featureFlag === Config.TRUE &&
        configValue !== Config.DISABLED
    );

    return isAllowed && (
        preference === Preferences.COLLAPSED_REPLY_THREADS_ON ||
        configValue === Config.ALWAYS_ON
    );
}
