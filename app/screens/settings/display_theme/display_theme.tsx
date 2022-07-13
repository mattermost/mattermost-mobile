// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {View} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SettingContainer from '../setting_container';

import CustomTheme from './custom_theme';
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
    currentTeamId: string;
    currentUserId: string;
}

const DisplayTheme = ({allowedThemeKeys, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const [customTheme, setCustomTheme] = useState<Theme|null>();

    const styles = getStyleSheet(theme);

    useEffect(() => {
        if (theme.type === 'custom') {
            setCustomTheme(theme);
        }
    }, []);

    const updateTheme = useCallback((selectedThemeKey: string) => {
        const selectedTheme = allowedThemeKeys.find((tk) => tk === selectedThemeKey);
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
    }, [serverUrl, allowedThemeKeys, currentTeamId]);

    return (
        <SettingContainer>
            <View style={styles.wrapper}>
                <ThemeTiles
                    allowedThemeKeys={allowedThemeKeys}
                    onThemeChange={updateTheme}
                />
                {customTheme && (
                    <CustomTheme
                        customTheme={customTheme}
                        setTheme={updateTheme}
                    />
                )}
            </View>
        </SettingContainer>
    );
};

export default DisplayTheme;
