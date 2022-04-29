// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {ComponentType, createContext, useEffect} from 'react';
import {Appearance} from 'react-native';

import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentTeamId} from '@queries/servers/system';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import type {PreferenceModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';

type Props = {
    currentTeamId?: string;
    children: React.ReactNode;
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

const ThemeProvider = ({currentTeamId, children, themes}: Props) => {
    const getTheme = (): Theme => {
        if (currentTeamId) {
            const teamTheme = themes.find((t) => t.name === currentTeamId) || themes[0];
            if (teamTheme?.value) {
                try {
                    const theme = setThemeDefaults(JSON.parse(teamTheme.value));
                    updateThemeIfNeeded(theme);

                    return theme;
                } catch {
                    // no theme change
                }
            }
        }

        const defaultTheme = getDefaultThemeByAppearance();
        updateThemeIfNeeded(defaultTheme);

        return defaultTheme;
    };

    useEffect(() => {
        const listener = Appearance.addChangeListener(getTheme);

        return () => listener.remove();
    }, []);

    return (<Provider value={getTheme()}>{children}</Provider>);
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
    themes: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME).observeWithColumns(['value']),
}));

export default enhancedThemeProvider(ThemeProvider);
