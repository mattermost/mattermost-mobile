// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import {Appearance} from 'react-native';

import {ENCMA_THEME} from '@constants/encma_theme';
import Preferences from '@constants/preferences';

// Keep this selector independent of query/store/React-context initialization.
export function getDefaultThemeByAppearance(): Theme {
    if (applicationId === 'com.encma.hxmain') {
        return ENCMA_THEME;
    }
    return Appearance.getColorScheme() === 'dark' ? Preferences.THEMES.onyx : Preferences.THEMES.denim;
}
