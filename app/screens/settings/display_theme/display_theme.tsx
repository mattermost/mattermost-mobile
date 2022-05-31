// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import CustomTheme from '@screens/settings/display_theme/custom_theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {ThemeTiles} from './theme_tiles';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
    };
});

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    customTheme?: Theme;
    currentTeamId: string;
    currentUserId: string;
}
const DisplayTheme = ({allowedThemeKeys, customTheme, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const setTheme = useCallback((selectedThemeKey: string) => {
        const allThemes = [...allowedThemeKeys, customTheme?.type];
        const selectedTheme = allThemes.find((tk) => tk === selectedThemeKey);
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
    }, [serverUrl]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.wrapper}>
                <ThemeTiles
                    allowedThemeKeys={allowedThemeKeys}
                    onThemeChange={setTheme}
                />
                {customTheme && (
                    <CustomTheme
                        customTheme={customTheme}
                        setTheme={setTheme}
                    />
                )}
            </View>
        </ScrollView>
    );
};

export default DisplayTheme;
