// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import {getSaveButton} from '@screens/settings/config';

import SettingContainer from '../setting_container';

import CustomTheme from './custom_theme';
import {ThemeTiles} from './theme_tiles';

const SAVE_DISPLAY_THEME_BTN_ID = 'SAVE_DISPLAY_THEME_BTN_ID';

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    componentId: string;
    currentTeamId: string;
    currentUserId: string;
}
const DisplayTheme = ({allowedThemeKeys, componentId, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const initialTheme = useMemo(() => theme.type, []); // dependency array should remain empty

    const [displayTheme, setDisplayTheme] = useState<string | undefined>(initialTheme);

    const saveButton = useMemo(() => getSaveButton(SAVE_DISPLAY_THEME_BTN_ID, intl, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    const close = () => popTopScreen(componentId);

    const updateTheme = useCallback(() => {
        const selectedTheme = allowedThemeKeys.find((tk) => tk === displayTheme);
        if (!selectedTheme) {
            return;
        }
        const pref: PreferenceType = {
            category: Preferences.CATEGORY_THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(Preferences.THEMES[selectedTheme]),
        };
        savePreference(serverUrl, [pref]);
        close();
    }, [serverUrl, allowedThemeKeys, currentTeamId, displayTheme]);

    useEffect(() => {
        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled: initialTheme?.toLowerCase() !== displayTheme?.toLowerCase(),
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, saveButton, displayTheme, initialTheme]);

    useNavButtonPressed(SAVE_DISPLAY_THEME_BTN_ID, componentId, updateTheme, [updateTheme]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SettingContainer>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={setDisplayTheme}
                selectedTheme={displayTheme}
            />
            {theme.type === 'custom' && (
                <CustomTheme
                    setTheme={setDisplayTheme}
                    displayTheme={displayTheme}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
