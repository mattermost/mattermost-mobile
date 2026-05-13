// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';

import {savePreference} from '@actions/remote/preference';
import SettingContainer from '@components/settings/container';
import {Preferences, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack} from '@screens/navigation';

import CustomTheme from './custom_theme';
import {ThemeTiles} from './theme_tiles';

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    currentTeamId: string;
    currentUserId: string;
}
const DisplayTheme = ({allowedThemeKeys, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [customTheme, setCustomTheme] = useState(theme.type?.toLowerCase() === 'custom' ? theme : undefined);

    const handleThemeChange = usePreventDoubleTap(useCallback(async (themeSelected: string) => {
        const allowedTheme = allowedThemeKeys.find((tk) => tk === themeSelected);
        const themeJson = Preferences.THEMES[allowedTheme as ThemeKey] || customTheme;

        const pref: PreferenceType = {
            category: Preferences.CATEGORIES.THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(themeJson),
        };
        await savePreference(serverUrl, [pref]);
    }, [allowedThemeKeys, currentTeamId, currentUserId, customTheme, serverUrl]));

    useDidUpdate(() => {
        // when the user selects any of the predefined theme when the current theme is custom, the custom theme will disappear.
        // by storing the current theme in the state, the custom theme will remain, and the user can switch back to it
        if (theme.type?.toLowerCase() === 'custom') {
            setCustomTheme(theme);
        }
    }, [theme.type]);

    useAndroidHardwareBackHandler(Screens.SETTINGS_DISPLAY_THEME, navigateBack);

    return (
        <SettingContainer testID='theme_display_settings'>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={handleThemeChange}
                selectedTheme={theme.type}
            />
            {customTheme && (
                <CustomTheme
                    setTheme={handleThemeChange}
                    displayTheme={'custom'}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
