// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import useBackNavigation from '@hooks/navigate_back';
import {usePreventDoubleTap} from '@hooks/utils';
import {popTopScreen} from '@screens/navigation';

import CustomTheme from './custom_theme';
import {ThemeTiles} from './theme_tiles';

import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    autoSwitchDescription: {
        id: 'settings_display.theme.auto_switch_desc',
        defaultMessage: "Automatically switch between light and dark themes when your device's appearance changes",
    },
    lightThemeHeader: {
        id: 'settings_display.theme.light_theme',
        defaultMessage: 'Light Theme',
    },
    darkThemeHeader: {
        id: 'settings_display.theme.dark_theme',
        defaultMessage: 'Dark Theme',
    },
});

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
    darkThemeType?: string;
    themeAutoSwitch: boolean;
}
const DisplayTheme = ({allowedThemeKeys, componentId, currentTeamId, currentUserId, darkThemeType, themeAutoSwitch}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const [autoSwitch, setAutoSwitch] = useState(themeAutoSwitch);
    const [selectedLightTheme, setSelectedLightTheme] = useState<string | undefined>(theme.type?.toLowerCase());
    const [selectedDarkTheme, setSelectedDarkTheme] = useState<string | undefined>(darkThemeType ?? 'onyx');
    const [customTheme, setCustomTheme] = useState(theme.type?.toLowerCase() === 'custom' ? theme : undefined);

    // Track when the theme changes to a custom type (e.g. set by another client),
    // so we can show the custom theme option in the theme picker.
    useDidUpdate(() => {
        if (theme.type?.toLowerCase() === 'custom') {
            setCustomTheme(theme);
        }
    }, [theme.type]);

    const close = () => popTopScreen(componentId);

    // When auto-switch is OFF, save theme immediately on tap (existing behavior)
    const handleImmediateThemeChange = usePreventDoubleTap(useCallback(async (themeKey: string) => {
        const allowedTheme = allowedThemeKeys.find((tk) => tk === themeKey);
        const themeJson = Preferences.THEMES[allowedTheme as ThemeKey] || customTheme;

        const pref: PreferenceType = {
            category: Preferences.CATEGORIES.THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(themeJson),
        };
        await savePreference(serverUrl, [pref]);
    }, [allowedThemeKeys, currentTeamId, currentUserId, customTheme, serverUrl]));

    // When auto-switch is ON, track light theme selection locally
    const handleLightThemeSelect = useCallback((themeKey: string) => {
        setSelectedLightTheme(themeKey);
    }, []);

    const handleDarkThemeSelect = useCallback((themeKey: string) => {
        setSelectedDarkTheme(themeKey);
    }, []);

    // Save all preferences on back navigation when auto-switch is ON
    const saveAutoSwitchAndClose = useCallback(async () => {
        popTopScreen(componentId);

        const prefs: PreferenceType[] = [];

        // Save auto-switch preference
        if (autoSwitch !== themeAutoSwitch) {
            prefs.push({
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.THEME_AUTO_SWITCH,
                user_id: currentUserId,
                value: autoSwitch ? 'true' : 'false',
            });
        }

        if (autoSwitch) {
            // Save light theme
            const lightThemeJson = Preferences.THEMES[selectedLightTheme as ThemeKey] || customTheme;
            if (lightThemeJson) {
                prefs.push({
                    category: Preferences.CATEGORIES.THEME,
                    name: currentTeamId,
                    user_id: currentUserId,
                    value: JSON.stringify(lightThemeJson),
                });
            }

            // Save dark theme
            const darkThemeJson = Preferences.THEMES[selectedDarkTheme as ThemeKey];
            if (darkThemeJson) {
                prefs.push({
                    category: Preferences.CATEGORIES.THEME_DARK,
                    name: currentTeamId,
                    user_id: currentUserId,
                    value: JSON.stringify(darkThemeJson),
                });
            }
        }

        if (prefs.length) {
            await savePreference(serverUrl, prefs);
        }
    }, [autoSwitch, componentId, currentTeamId, currentUserId, customTheme, selectedDarkTheme, selectedLightTheme, serverUrl, themeAutoSwitch]);

    // When turning off auto-switch, also save the preference on close
    const saveDisableAutoSwitchAndClose = useCallback(async () => {
        popTopScreen(componentId);

        if (autoSwitch !== themeAutoSwitch) {
            await savePreference(serverUrl, [{
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.THEME_AUTO_SWITCH,
                user_id: currentUserId,
                value: 'false',
            }]);
        }
    }, [autoSwitch, componentId, currentUserId, serverUrl, themeAutoSwitch]);

    let backHandler = close;
    if (autoSwitch) {
        backHandler = saveAutoSwitchAndClose;
    } else if (autoSwitch !== themeAutoSwitch) {
        backHandler = saveDisableAutoSwitchAndClose;
    }

    useBackNavigation(backHandler);
    useAndroidHardwareBackHandler(componentId, backHandler);

    if (autoSwitch) {
        return (
            <SettingContainer testID='theme_display_settings'>
                <SettingBlock
                    footerText={messages.autoSwitchDescription}
                >
                    <SettingOption
                        action={setAutoSwitch}
                        label={intl.formatMessage({id: 'settings_display.theme.auto_switch_label', defaultMessage: 'Automatically switch between themes'})}
                        selected={autoSwitch}
                        testID='theme_display_settings.auto_switch.toggle'
                        type='toggle'
                    />
                    <SettingSeparator/>
                </SettingBlock>
                <SettingBlock
                    headerText={messages.lightThemeHeader}
                >
                    <ThemeTiles
                        allowedThemeKeys={allowedThemeKeys}
                        onThemeChange={handleLightThemeSelect}
                        selectedTheme={selectedLightTheme}
                    />
                    {customTheme && (
                        <CustomTheme
                            setTheme={handleLightThemeSelect}
                            displayTheme={selectedLightTheme}
                        />
                    )}
                </SettingBlock>
                <SettingBlock
                    headerText={messages.darkThemeHeader}
                >
                    <ThemeTiles
                        allowedThemeKeys={allowedThemeKeys}
                        onThemeChange={handleDarkThemeSelect}
                        selectedTheme={selectedDarkTheme}
                    />
                </SettingBlock>
            </SettingContainer>
        );
    }

    return (
        <SettingContainer testID='theme_display_settings'>
            <SettingBlock
                footerText={messages.autoSwitchDescription}
            >
                <SettingOption
                    action={setAutoSwitch}
                    label={intl.formatMessage({id: 'settings_display.theme.auto_switch_label', defaultMessage: 'Automatically switch between themes'})}
                    selected={autoSwitch}
                    testID='theme_display_settings.auto_switch.toggle'
                    type='toggle'
                />
                <SettingSeparator/>
            </SettingBlock>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={handleImmediateThemeChange}
                selectedTheme={theme.type}
            />
            {customTheme && (
                <CustomTheme
                    setTheme={handleImmediateThemeChange}
                    displayTheme={'custom'}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
