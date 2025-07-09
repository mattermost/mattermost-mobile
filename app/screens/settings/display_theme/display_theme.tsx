// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';

import {savePreference} from '@actions/remote/preference';
import SettingContainer from '@components/settings/container';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {usePreventDoubleTap} from '@hooks/utils';
import {popTopScreen} from '@screens/navigation';

import CustomTheme from './custom_theme';
import {ThemeTiles} from './theme_tiles';

import type {AvailableScreens} from '@typings/screens/navigation';

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
}
const DisplayTheme = ({allowedThemeKeys, componentId, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [currentTheme, setCurrentTheme] = useState(theme);
    const [customTheme, setCustomTheme] = useState(theme.type?.toLowerCase() === 'custom' ? theme : undefined);

    const close = () => popTopScreen(componentId);

    const setThemePreference = useCallback(async (theTheme: string) => {
        const allowedTheme = allowedThemeKeys.find((tk) => tk === theTheme);
        const themeJson = Preferences.THEMES[allowedTheme as ThemeKey] || customTheme;

        const pref: PreferenceType = {
            category: Preferences.CATEGORIES.THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(themeJson),
        };
        await savePreference(serverUrl, [pref]);

        setCurrentTheme(themeJson);

    }, [allowedThemeKeys, currentTeamId, currentUserId, serverUrl, customTheme]);

    const handleSelectTheme = usePreventDoubleTap(useCallback((themeSelected: string) => {
        setThemePreference(themeSelected);
    }, [setThemePreference]));

    useDidUpdate(() => {
        // if the theme changed on the server by another client, this will update to the latest theme
        if (theme.type?.toLowerCase() !== currentTheme.type?.toLowerCase()) {
            setCurrentTheme(theme);
        }
        if (theme.type?.toLowerCase() === 'custom') {
            setCustomTheme(theme);
        }
    }, [theme, currentTheme]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SettingContainer testID='theme_display_settings'>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={handleSelectTheme}
                selectedTheme={theme.type}
            />
            {customTheme && (
                <CustomTheme
                    setTheme={handleSelectTheme}
                    displayTheme={'custom'}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
