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
    const [customTheme, setCustomTheme] = useState(theme.type?.toLowerCase() === 'custom' ? theme : undefined);

    const close = () => popTopScreen(componentId);

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
        if (theme.type?.toLowerCase() === 'custom') {
            setCustomTheme(theme);
        }
    }, [theme.type]);

    useAndroidHardwareBackHandler(componentId, close);

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
