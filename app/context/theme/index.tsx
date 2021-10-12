// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import React, {ComponentType, createContext, useEffect} from 'react';
import {Appearance, EventSubscription} from 'react-native';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import EphemeralStore from '@store/ephemeral_store';
import {setNavigationStackStyles, setThemeDefaults} from '@utils/theme';

import type {PreferenceModel, SystemModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';

type Props = {
    currentTeamId?: string;
    children: React.ReactNode;
    themes: PreferenceModel[];
}

type WithThemeProps = {
    theme: Theme;
}

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;

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
                    const theme = setThemeDefaults(JSON.parse(teamTheme.value) as Theme);
                    EphemeralStore.theme = theme;
                    requestAnimationFrame(() => {
                        setNavigationStackStyles(theme);
                    });
                    return theme;
                } catch {
                    // no theme change
                }
            }
        }

        return getDefaultThemeByAppearance();
    };

    useEffect(() => {
        const listener = Appearance.addChangeListener(getTheme) as EventSubscription;

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
    currentTeamId: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap((row) => of$(row.value)),
        catchError(() => of$(undefined)),
    ),
    themes: database.get(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_THEME)).observeWithColumns(['value']),
}));

export default enhancedThemeProvider(ThemeProvider);
