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

type ThemeSectionProps = {
    allowedThemeKeys: string[];
    customTheme?: Theme;
    onThemeChange: (themeKey: string) => void;
    selectedTheme?: string;
};

const ThemeSection = ({
    allowedThemeKeys,
    customTheme,
    onThemeChange,
    selectedTheme,
}: ThemeSectionProps) => (
    <>
        <ThemeTiles
            allowedThemeKeys={allowedThemeKeys}
            onThemeChange={onThemeChange}
            selectedTheme={selectedTheme}
        />
        {customTheme && (
            <CustomTheme
                setTheme={onThemeChange}
                displayTheme={selectedTheme}
            />
        )}
    </>
);

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
    darkTheme?: Theme;
    lightTheme?: Theme;
    themeAutoSwitch: boolean;
};
const DisplayTheme = ({
    allowedThemeKeys,
    componentId,
    currentTeamId,
    currentUserId,
    darkTheme,
    lightTheme,
    themeAutoSwitch,
}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const activeTheme = useTheme();
    const intl = useIntl();
    const lightThemeType = lightTheme?.type?.toLowerCase();
    const darkThemeType = darkTheme?.type?.toLowerCase();
    const [autoSwitch, setAutoSwitch] = useState(themeAutoSwitch);
    const [selectedLightTheme, setSelectedLightTheme] = useState<string | undefined>(lightThemeType ?? activeTheme.type?.toLowerCase());
    const [selectedDarkTheme, setSelectedDarkTheme] = useState<string | undefined>(darkThemeType ?? 'onyx');
    const getInitialCustomTheme = () => {
        if (lightThemeType === 'custom') {
            return lightTheme;
        }
        if (activeTheme.type?.toLowerCase() === 'custom') {
            return activeTheme;
        }
        return undefined;
    };
    const [customTheme, setCustomTheme] = useState(getInitialCustomTheme);
    const [customDarkTheme, setCustomDarkTheme] = useState(
        darkThemeType === 'custom' ? darkTheme : undefined,
    );

    // When the user selects any of the predefined theme when the current theme is custom, the custom theme will disappear.
    // By storing the current theme in the state, the custom theme will remain, and the user can switch back to it.
    useDidUpdate(() => {
        if (lightThemeType === 'custom') {
            setCustomTheme(lightTheme);
        } else if (activeTheme.type?.toLowerCase() === 'custom') {
            setCustomTheme(activeTheme);
        }
    }, [lightThemeType, activeTheme.type]);

    useDidUpdate(() => {
        if (darkThemeType === 'custom') {
            setCustomDarkTheme(darkTheme);
        }
    }, [darkThemeType]);

    const handleAutoSwitchToggle = useCallback(async (enabled: boolean) => {
        setAutoSwitch(enabled);
        await savePreference(serverUrl, [{
            category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
            name: Preferences.THEME_AUTO_SWITCH,
            user_id: currentUserId,
            value: enabled ? 'true' : 'false',
        }]);
    }, [currentUserId, serverUrl]);

    const close = () => popTopScreen(componentId);

    // When auto-switch is OFF, save theme immediately on tap (existing behavior)
    const handleImmediateThemeChange = usePreventDoubleTap(
        useCallback(
            async (themeKey: string) => {
                const allowedTheme = allowedThemeKeys.find((tk) => tk === themeKey);
                const themeJson = Preferences.THEMES[allowedTheme as ThemeKey] || customTheme;

                const pref: PreferenceType = {
                    category: Preferences.CATEGORIES.THEME,
                    name: currentTeamId,
                    user_id: currentUserId,
                    value: JSON.stringify(themeJson),
                };
                await savePreference(serverUrl, [pref]);
            },
            [allowedThemeKeys, currentTeamId, currentUserId, customTheme, serverUrl],
        ),
    );

    // When auto-switch is ON, save theme immediately on tap
    const handleLightThemeSelect = useCallback(async (themeKey: string) => {
        setSelectedLightTheme(themeKey);
        const themeJson = Preferences.THEMES[themeKey as ThemeKey] || customTheme;
        if (themeJson) {
            await savePreference(serverUrl, [{
                category: Preferences.CATEGORIES.THEME,
                name: currentTeamId,
                user_id: currentUserId,
                value: JSON.stringify(themeJson),
            }]);
        }
    }, [currentTeamId, currentUserId, customTheme, serverUrl]);

    const handleDarkThemeSelect = useCallback(async (themeKey: string) => {
        setSelectedDarkTheme(themeKey);
        const themeJson = Preferences.THEMES[themeKey as ThemeKey] || customDarkTheme;
        if (themeJson) {
            await savePreference(serverUrl, [{
                category: Preferences.CATEGORIES.THEME_DARK,
                name: currentTeamId,
                user_id: currentUserId,
                value: JSON.stringify(themeJson),
            }]);
        }
    }, [currentTeamId, currentUserId, customDarkTheme, serverUrl]);

    useBackNavigation(close);
    useAndroidHardwareBackHandler(componentId, close);

    if (autoSwitch) {
        return (
            <SettingContainer testID='theme_display_settings'>
                <SettingBlock footerText={messages.autoSwitchDescription}>
                    <SettingOption
                        action={handleAutoSwitchToggle}
                        label={intl.formatMessage({
                            id: 'settings_display.theme.auto_switch_label',
                            defaultMessage: 'Automatically switch between themes',
                        })}
                        selected={autoSwitch}
                        testID='theme_display_settings.auto_switch.toggle'
                        type='toggle'
                    />
                    <SettingSeparator/>
                </SettingBlock>
                <SettingBlock headerText={messages.lightThemeHeader}>
                    <ThemeSection
                        allowedThemeKeys={allowedThemeKeys}
                        customTheme={customTheme}
                        onThemeChange={handleLightThemeSelect}
                        selectedTheme={selectedLightTheme}
                    />
                </SettingBlock>
                <SettingBlock headerText={messages.darkThemeHeader}>
                    <ThemeSection
                        allowedThemeKeys={allowedThemeKeys}
                        customTheme={customDarkTheme}
                        onThemeChange={handleDarkThemeSelect}
                        selectedTheme={selectedDarkTheme}
                    />
                </SettingBlock>
            </SettingContainer>
        );
    }

    return (
        <SettingContainer testID='theme_display_settings'>
            <SettingBlock footerText={messages.autoSwitchDescription}>
                <SettingOption
                    action={handleAutoSwitchToggle}
                    label={intl.formatMessage({
                        id: 'settings_display.theme.auto_switch_label',
                        defaultMessage: 'Automatically switch between themes',
                    })}
                    selected={autoSwitch}
                    testID='theme_display_settings.auto_switch.toggle'
                    type='toggle'
                />
                <SettingSeparator/>
            </SettingBlock>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={handleImmediateThemeChange}
                selectedTheme={activeTheme.type}
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
