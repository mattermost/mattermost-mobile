// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React, {type ComponentType, createContext, useEffect, useState} from 'react';
import {Appearance, type ColorSchemeName} from 'react-native';

import {Preferences} from '@constants';
import useDidUpdate from '@hooks/did_update';
import {observeThemeAutoSwitchPreference, queryDarkThemePreferences, queryThemePreferences} from '@queries/servers/preference';
import {observeCurrentTeamId} from '@queries/servers/system';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import type {PreferenceModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';

type Props = {
    currentTeamId?: string;
    children: React.ReactNode;
    darkThemes: PreferenceModel[];
    themeAutoSwitch: boolean;
    themes: PreferenceModel[];
}

type WithThemeProps = {
    theme: Theme;
}

export function getDefaultThemeByAppearance(): Theme {
    if (Appearance.getColorScheme() === 'dark') {
        return Preferences.THEMES.onyx;
    }
    return Preferences.THEMES.denim;
}

export const ThemeContext = createContext(getDefaultThemeByAppearance());
const {Consumer, Provider} = ThemeContext;

const themeCache = new Map<string, Theme>();
let clearingThemeCache = false;
const clearThemeCache = () => {
    if (clearingThemeCache) {
        return;
    }
    clearingThemeCache = true;
    themeCache.clear();
    setTimeout(() => {
        // We set this timeout to avoid clearing the cache multiple times
        // this would happen as we have a Provider for each screen in the stack
        // and when the themes changes we only want to invalidate the cache once
        clearingThemeCache = false;
    }, 300);
};

const resolveThemeFromPreferences = (teamId: string | undefined, themes: PreferenceModel[], fallback: Theme): Theme => {
    if (teamId) {
        const teamTheme = themes.find((t) => t.name === teamId) || themes[0];
        if (teamTheme?.value) {
            try {
                return setThemeDefaults(JSON.parse(teamTheme.value));
            } catch {
                // no theme change
            }
        }
    }
    return fallback;
};

const getTheme = (
    teamId: string | undefined,
    themes: PreferenceModel[],
    isAutoSwitch = false,
    darkThemes: PreferenceModel[] = [],
    colorScheme: ColorSchemeName = Appearance.getColorScheme(),
): Theme => {
    const cacheKey = isAutoSwitch ? `${teamId || 'default'}_${colorScheme}` : (teamId || 'default');
    if (themeCache.has(cacheKey)) {
        return themeCache.get(cacheKey)!;
    }

    let newTheme: Theme;
    if (isAutoSwitch) {
        if (colorScheme === 'dark') {
            newTheme = resolveThemeFromPreferences(teamId, darkThemes, Preferences.THEMES.onyx);
        } else {
            newTheme = resolveThemeFromPreferences(teamId, themes, Preferences.THEMES.denim);
        }
    } else {
        newTheme = resolveThemeFromPreferences(teamId, themes, getDefaultThemeByAppearance());
    }

    themeCache.set(cacheKey, newTheme);
    return newTheme;
};

const ThemeProvider = ({currentTeamId, children, darkThemes, themeAutoSwitch, themes}: Props) => {
    const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
    const [theme, setTheme] = useState(() => getTheme(currentTeamId, themes, themeAutoSwitch, darkThemes, colorScheme));

    useEffect(() => {
        const listener = Appearance.addChangeListener(({colorScheme: newScheme}) => {
            setColorScheme(newScheme);
        });

        return () => listener.remove();
    }, []);

    // Clear theme cache before re-resolving the theme, so getTheme
    // doesn't return stale cached values when preferences change.
    useDidUpdate(() => {
        clearThemeCache();
    }, [themes, darkThemes, themeAutoSwitch]);

    useEffect(() => {
        const newTheme = getTheme(currentTeamId, themes, themeAutoSwitch, darkThemes, colorScheme);
        if (theme !== newTheme) {
            setTheme(newTheme);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps -- theme is intentionally excluded to avoid infinite re-renders
    }, [colorScheme, currentTeamId, darkThemes, themeAutoSwitch, themes]);

    useEffect(() => {
        updateThemeIfNeeded(theme);
    }, [theme]);

    return (<Provider value={theme}>{children}</Provider>);
};

export const CustomThemeProvider = ({theme, children}: {theme: Theme; children: React.ReactNode}) => {
    return (<Provider value={theme}>{children}</Provider>);
};

export function withTheme<T extends WithThemeProps>(Component: ComponentType<T>): ComponentType<T> {
    return function ThemeComponent(props) {
        return (
            <Consumer>
                {(theme: Theme) => (
                    <Component
                        {...props}
                        theme={theme}
                    />
                )}
            </Consumer>
        );
    };
}

export function useTheme(): Theme {
    return React.useContext(ThemeContext);
}

const enhancedThemeProvider = withObservables([], ({database}: {database: Database}) => ({
    currentTeamId: observeCurrentTeamId(database),
    darkThemes: queryDarkThemePreferences(database).observeWithColumns(['value']),
    themeAutoSwitch: observeThemeAutoSwitchPreference(database),
    themes: queryThemePreferences(database).observeWithColumns(['value']),
}));

export default enhancedThemeProvider(ThemeProvider);
