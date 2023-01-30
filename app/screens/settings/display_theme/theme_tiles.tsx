// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ThemeThumbnail from './theme_thumbnail';

const TILE_PADDING = 8;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'column',
            padding: TILE_PADDING,
        },
        imageWrapper: {
            position: 'relative',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        thumbnail: {
            resizeMode: 'stretch',
        },
        check: {
            position: 'absolute',
            right: 5,
            bottom: 5,
            color: theme.sidebarTextActiveBorder,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            textTransform: 'capitalize',
        },
        tilesContainer: {
            marginBottom: 30,
            paddingLeft: 8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            backgroundColor: theme.centerChannelBg,
        },
    };
});

type ThemeTileProps = {
    action: (v: string) => void;
    actionValue: string;
    activeTheme: Theme;
    label: React.ReactElement;
    selected: boolean;
    testID?: string;
    theme: Theme;
};
export const ThemeTile = ({
    action,
    actionValue,
    activeTheme,
    label,
    selected,
    testID,
    theme,
}: ThemeTileProps) => {
    const isTablet = useIsTablet();
    const styles = getStyleSheet(activeTheme);
    const {width: deviceWidth} = useWindowDimensions();

    const layoutStyle = useMemo(() => {
        const tilesPerLine = isTablet ? 4 : 2;
        const fullWidth = isTablet ? deviceWidth - 40 : deviceWidth;

        return {
            container: {
                width: (fullWidth / tilesPerLine) - TILE_PADDING,
            },
            thumbnail: {
                width: (fullWidth / tilesPerLine) - (TILE_PADDING + 16),
            },
        };
    }, [isTablet, deviceWidth]);

    const onPressHandler = useCallback(() => {
        action(actionValue);
    }, [action, actionValue]);

    return (
        <TouchableOpacity
            onPress={onPressHandler}
            style={[styles.container, layoutStyle.container]}
            testID={testID}
        >
            <View style={[styles.imageWrapper, layoutStyle.thumbnail]}>
                <ThemeThumbnail
                    borderColorBase={selected ? activeTheme.buttonBg : activeTheme.centerChannelBg}
                    borderColorMix={selected ? activeTheme.buttonBg : changeOpacity(activeTheme.centerChannelColor, 0.16)}
                    theme={theme}
                    width={layoutStyle.thumbnail.width}
                />
                {selected && (
                    <CompassIcon
                        name='check-circle'
                        size={31.2}
                        style={styles.check}
                        testID={`${testID}.selected`}
                    />
                )}
            </View>
            {label}
        </TouchableOpacity>
    );
};

type ThemeTilesProps = {
    allowedThemeKeys: string[];
    onThemeChange: (v: string) => void;
    selectedTheme: string | undefined;
}
export const ThemeTiles = ({allowedThemeKeys, onThemeChange, selectedTheme}: ThemeTilesProps) => {
    const theme = useTheme();

    const styles = getStyleSheet(theme);
    return (
        <View style={styles.tilesContainer}>
            {
                allowedThemeKeys.map((themeKey: ThemeKey) => {
                    if (!Preferences.THEMES[themeKey] || !selectedTheme) {
                        return null;
                    }

                    return (
                        <ThemeTile
                            key={themeKey}
                            label={(
                                <Text style={styles.label}>
                                    {themeKey}
                                </Text>
                            )}
                            action={onThemeChange}
                            actionValue={themeKey}
                            selected={selectedTheme?.toLowerCase() === themeKey.toLowerCase()}
                            testID={`theme_display_settings.${themeKey}.option`}
                            theme={Preferences.THEMES[themeKey]}
                            activeTheme={theme}
                        />
                    );
                })
            }
        </View>
    );
};
