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
            marginTop: 8,
        },
        imageWrapper: {
            position: 'relative',
            alignItems: 'flex-start',
            marginBottom: 12,
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
        },
        tilesContainer: {
            marginBottom: 30,
            paddingLeft: 8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

type ThemeTileProps = {
    action: (v: string) => void;
    actionValue: string;
    activeTheme: Theme;
    isLandscape: boolean;
    isTablet: boolean;
    label: React.ReactElement;
    selected: boolean;
    tileTheme: Theme;
};
export const ThemeTile = ({
    action,
    actionValue,
    activeTheme,
    isLandscape,
    isTablet,
    label,
    selected,
    tileTheme,
}: ThemeTileProps) => {
    const style = getStyleSheet(activeTheme);
    const {width: deviceWidth} = useWindowDimensions();

    const layoutStyle = useMemo(() => {
        const tilesPerLine = isLandscape || isTablet ? 4 : 2;
        const fullWidth = isLandscape ? deviceWidth - 40 : deviceWidth;

        return {
            container: {
                width: (fullWidth / tilesPerLine) - TILE_PADDING,
            },
            thumbnail: {
                width: (fullWidth / tilesPerLine) - (TILE_PADDING + 16),
            },
        };
    }, [isLandscape, isTablet, deviceWidth]);

    const onPressHandler = useCallback(() => {
        action(actionValue);
    }, [action, actionValue]);

    return (
        <TouchableOpacity
            style={[style.container, layoutStyle.container]}
            onPress={onPressHandler}
        >
            <View style={[style.imageWrapper, layoutStyle.thumbnail]}>
                <ThemeThumbnail
                    width={layoutStyle.thumbnail.width}
                    borderColorBase={selected ? activeTheme.sidebarTextActiveBorder : activeTheme.centerChannelBg}
                    borderColorMix={selected ? activeTheme.sidebarTextActiveBorder : changeOpacity(activeTheme.centerChannelColor, 0.16)}
                    sidebarBg={tileTheme.sidebarBg}
                    sidebarText={changeOpacity(tileTheme.sidebarText, 0.48)}
                    sidebarUnreadText={tileTheme.sidebarUnreadText}
                    onlineIndicator={tileTheme.onlineIndicator}
                    awayIndicator={tileTheme.awayIndicator}
                    dndIndicator={tileTheme.dndIndicator}
                    centerChannelColor={changeOpacity(tileTheme.centerChannelColor, 0.16)}
                    centerChannelBg={tileTheme.centerChannelBg}
                    newMessageSeparator={tileTheme.newMessageSeparator}
                    buttonBg={tileTheme.buttonBg}
                />
                {selected && (
                    <CompassIcon
                        name='check-circle'
                        size={31.2}
                        style={style.check}
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
}
export const ThemeTiles = ({allowedThemeKeys, onThemeChange}: ThemeTilesProps) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();

    const styles = getStyleSheet(theme);
    return (
        <View style={styles.tilesContainer}>
            {
                allowedThemeKeys.map((themeKey: string) => (
                    <ThemeTile
                        key={themeKey}
                        label={(
                            <Text style={styles.label}>
                                {themeKey}
                            </Text>
                        )}
                        action={onThemeChange}
                        actionValue={themeKey}
                        selected={theme.type?.toLowerCase() === themeKey.toLowerCase()}
                        tileTheme={Preferences.THEMES[themeKey]}
                        activeTheme={theme}
                        isLandscape={dimensions.width > dimensions.height}
                        isTablet={isTablet}
                    />
                ))
            }
        </View>
    );
};
