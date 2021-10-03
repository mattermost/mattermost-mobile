// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import React, {ComponentType, createContext, useEffect} from 'react';
import {Appearance, EventSubscription} from 'react-native';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import EphemeralStore from '@store/ephemeral_store';
import {setNavigationStackStyles} from '@utils/theme';

import type {PreferenceModel, SystemModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';

type Props = {
    currentTeamId: SystemModel[];
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
        if (currentTeamId.length) {
            const teamId = currentTeamId[0]?.value;
            const teamTheme = themes.find((t) => t.name === teamId) || themes[0];
            if (teamTheme?.value) {
                try {
                    const theme = JSON.parse(teamTheme.value) as Theme;
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
    currentTeamId: database.get(SYSTEM).query(Q.where('id', SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID)).observe(),
    themes: database.get(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_THEME)).observeWithColumns(['value']),
}));

export default enhancedThemeProvider(ThemeProvider);
