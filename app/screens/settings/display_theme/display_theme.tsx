// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';

import {savePreference} from '@actions/remote/preference';
import SettingContainer from '@components/settings/container';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
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
    const initialTheme = useMemo(() => theme, [/* dependency array should remain empty */]);
    const [newTheme, setNewTheme] = useState<string | undefined>(undefined);

    const close = () => popTopScreen(componentId);

    const setThemePreference = useCallback(() => {
        const allowedTheme = allowedThemeKeys.find((tk) => tk === newTheme);
        const themeJson = Preferences.THEMES[allowedTheme as ThemeKey] || initialTheme;

        const pref: PreferenceType = {
            category: Preferences.CATEGORIES.THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(themeJson),
        };
        savePreference(serverUrl, [pref]);
    }, [allowedThemeKeys, initialTheme, currentTeamId, currentUserId, serverUrl, newTheme]);

    useDidUpdate(() => {
        const differentTheme = theme.type?.toLowerCase() !== newTheme?.toLowerCase();

        if (!differentTheme) {
            close();
            return;
        }
        setThemePreference();
    }, [close, newTheme, setThemePreference, theme.type]);

    const onAndroidBack = () => {
        setThemePreference();
        close();
    };

    useAndroidHardwareBackHandler(componentId, onAndroidBack);

    return (
        <SettingContainer testID='theme_display_settings'>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={setNewTheme}
                selectedTheme={theme.type}
            />
            {initialTheme.type === 'custom' && (
                <CustomTheme
                    setTheme={setNewTheme}
                    displayTheme={initialTheme.type}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
