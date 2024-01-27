// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React, {type ComponentType, createContext, useEffect, useState} from 'react';
import {Appearance} from 'react-native';

import {Preferences} from '@constants';
import {queryThemePreferences} from '@queries/servers/preference';
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

const getTheme = (teamId: string | undefined, themes: PreferenceModel[]): Theme => {
    if (teamId) {
        const teamTheme = themes.find((t) => t.name === teamId) || themes[0];
        if (teamTheme?.value) {
            try {
                const theme = setThemeDefaults(JSON.parse(teamTheme.value));
                return theme;
            } catch {
                // no theme change
            }
        }
    }

    const defaultTheme = getDefaultThemeByAppearance();

    return defaultTheme;
};

const ThemeProvider = ({currentTeamId, children, themes}: Props) => {
    const [theme, setTheme] = useState(() => getTheme(currentTeamId, themes));

    useEffect(() => {
        const listener = Appearance.addChangeListener(() => {
            const newTheme = getTheme(currentTeamId, themes);
            if (theme !== newTheme) {
                setTheme(newTheme);
            }
        });

        return () => listener.remove();
    }, [currentTeamId, themes, theme]);

    useEffect(() => {
        updateThemeIfNeeded(theme);
    }, [theme]);

    useEffect(() => {
        setTheme(getTheme(currentTeamId, themes));
    }, [currentTeamId, themes]);

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
    themes: queryThemePreferences(database).observeWithColumns(['value']),
}));

export default enhancedThemeProvider(ThemeProvider);
