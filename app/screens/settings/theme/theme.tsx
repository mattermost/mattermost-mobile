// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {FC, useEffect, useMemo, useState} from 'react';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import tinycolor from 'tinycolor2';

import StatusBar from '@components/status_bar';
import {Preferences} from '@mm-redux/constants';
import {ActionResult} from '@mm-redux/types/actions';
import {OsColorSchemeName} from '@mm-redux/types/general';
import {PreferenceType} from '@mm-redux/types/preferences';
import {Theme as ThemePreference} from '@mm-redux/types/theme';
import OsSyncSection from '@screens/settings/theme/os_sync_section';
import {t} from '@utils/i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ThemeSection, {AllowedTheme} from './theme_section';

const Theme: FC<Props> = ({
    theme,
    allowedThemes,
    defaultLightTheme,
    lightTheme,
    darkTheme,
    userId,
    isThemeSyncWithOsAvailable,
    enableThemeSync,
    teamId,
    isLandscape,
    isTablet,
    allowCustomThemes,
    osColorScheme,
    actions,
}: Props) => {
    const style = useMemo(() => getStyleSheet(theme), [theme]);

    const [savedLightTheme, setSavedLightTheme] = useState<ThemePreference>();
    const [customTmpThemes, setCustomTmpThemes] = useState<{light?: ThemePreference; dark?: ThemePreference}>({});

    useEffect(() => {
        setCustomTmpThemes((prev) => ({
            light: lightTheme.type === CUSTOM_THEME_KEY ? lightTheme : prev.light,
            dark: darkTheme.type === CUSTOM_THEME_KEY ? darkTheme : prev.dark,
        }));
    }, [lightTheme, darkTheme]);

    useEffect(() => {
        if (!enableThemeSync && tinycolor(lightTheme.centerChannelBg).isLight()) {
            setSavedLightTheme(lightTheme);
        }
    }, [lightTheme, enableThemeSync]);

    const handleOsSyncToggle = (syncWithOs: boolean) => {
        if (!syncWithOs) {
            actions.savePreferences(userId, [
                {
                    user_id: userId,
                    category: Preferences.CATEGORY_ENABLE_THEME_SYNC,
                    name: teamId,
                    value: 'false',
                },
                {
                    user_id: userId,
                    category: Preferences.CATEGORY_THEME,
                    name: teamId,
                    value: JSON.stringify(theme),
                },
            ]);
            return;
        }
        const preferences = [{
            user_id: userId,
            category: Preferences.CATEGORY_ENABLE_THEME_SYNC,
            name: teamId,
            value: 'true',
        }];
        const shouldSwapTheme = tinycolor(lightTheme.centerChannelBg).isDark();
        if (shouldSwapTheme || savedLightTheme) {
            preferences.push({
                user_id: userId,
                category: Preferences.CATEGORY_THEME,
                name: teamId,
                value: JSON.stringify(savedLightTheme || defaultLightTheme),
            });
        }
        if (shouldSwapTheme) {
            preferences.push({
                user_id: userId,
                category: Preferences.CATEGORY_THEME_DARK,
                name: teamId,
                value: JSON.stringify(lightTheme),
            });
        }
        actions.savePreferences(userId, preferences);
    };
    const handleThemeChange = (changeDark: boolean) => (themeKey: string) => {
        const customTheme = changeDark ? customTmpThemes.dark : customTmpThemes.light;
        const themeToApply = themeKey === CUSTOM_THEME_KEY ? customTheme : allowedThemes.find((v) => v.key === themeKey);

        actions.savePreferences(userId, [{
            user_id: userId,
            category: changeDark ? Preferences.CATEGORY_THEME_DARK : Preferences.CATEGORY_THEME,
            name: teamId,
            value: JSON.stringify(themeToApply),
        }]);
    };

    return (
        <SafeAreaView
            edges={['left', 'right']}
            style={style.container}
            testID='theme_settings.screen'
        >
            <StatusBar/>
            <ScrollView
                style={style.scrollView}
                contentContainerStyle={style.scrollViewContent}
                alwaysBounceVertical={false}
                testID='theme_settings.scroll'
            >
                {isThemeSyncWithOsAvailable && (
                    <OsSyncSection
                        selected={enableThemeSync}
                        theme={theme}
                        onToggle={handleOsSyncToggle}
                        osColorScheme={osColorScheme}
                    />
                )}
                {enableThemeSync ? (
                    <>
                        <ThemeSection
                            testID='light_themes'
                            headerId={t('user.settings.display.theme.chooseLight')}
                            headerDefaultMessage='Choose a light theme'
                            theme={theme}
                            allowedThemes={allowedThemes.filter((allowedTheme) => allowedTheme.colorScheme === 'light')}
                            activeThemeType={lightTheme.type}
                            onSelect={handleThemeChange(false)}
                            customThemeAvailable={Boolean(customTmpThemes.light)}
                            isLandscape={isLandscape}
                            isTablet={isTablet}
                            allowCustomThemes={allowCustomThemes}
                        />
                        <ThemeSection
                            testID='dark_themes'
                            headerId={t('user.settings.display.theme.chooseDark')}
                            headerDefaultMessage='Choose a dark theme'
                            theme={theme}
                            allowedThemes={allowedThemes.filter((allowedTheme) => allowedTheme.colorScheme === 'dark')}
                            activeThemeType={darkTheme.type}
                            onSelect={handleThemeChange(true)}
                            customThemeAvailable={Boolean(customTmpThemes.dark)}
                            isLandscape={isLandscape}
                            isTablet={isTablet}
                            allowCustomThemes={allowCustomThemes}
                        />
                    </>
                ) : (
                    <ThemeSection
                        testID='all_themes'
                        headerId={t('user.settings.display.theme.chooseTheme')}
                        headerDefaultMessage='Choose a theme'
                        theme={theme}
                        allowedThemes={allowedThemes}
                        activeThemeType={lightTheme.type}
                        onSelect={handleThemeChange(false)}
                        customThemeAvailable={Boolean(customTmpThemes.light)}
                        isLandscape={isLandscape}
                        isTablet={isTablet}
                        allowCustomThemes={allowCustomThemes}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export const CUSTOM_THEME_KEY = 'custom';

type Props = {
    theme: ThemePreference;
    allowedThemes: AllowedTheme[];
    defaultLightTheme: ThemePreference;
    lightTheme: ThemePreference;
    darkTheme: ThemePreference;
    userId: string;
    isThemeSyncWithOsAvailable: boolean;
    enableThemeSync: boolean;
    teamId: string;
    isLandscape: boolean;
    isTablet: boolean;
    allowCustomThemes: boolean;
    osColorScheme: OsColorSchemeName;
    actions: Actions;
}

export type Actions = {
    savePreferences: (userId: string, preferences: PreferenceType[]) => Promise<ActionResult>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: ThemePreference) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    scrollView: {
        flex: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
    },
    scrollViewContent: {
        paddingVertical: 35,
    },
}));

export default Theme;
