// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config, Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';

import type PreferenceModel from '@typings/database/models/servers/preference';

export function processIsCRTEnabled(preferences: PreferenceModel[]|PreferenceType[], config?: ClientConfig): boolean {
    let preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_OFF;
    const configValue = config?.CollapsedThreads;
    if (configValue === Config.DEFAULT_ON) {
        preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_ON;
    }
    const preference = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.COLLAPSED_REPLY_THREADS, preferenceDefault);

    const isAllowed = (
        config?.FeatureFlagCollapsedThreads === Config.TRUE &&
        config?.CollapsedThreads !== Config.DISABLED
    );

    return isAllowed && (
        preference === Preferences.COLLAPSED_REPLY_THREADS_ON ||
        config?.CollapsedThreads === Config.ALWAYS_ON
    );
}
