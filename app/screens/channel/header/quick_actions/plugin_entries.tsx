// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {PluginMobileEntry} from './use_plugin_entries';

// One horizontally scrolling row, so any number of plugin entries costs the
// bottom sheet the same fixed height.
export const PLUGIN_ENTRIES_HEIGHT = 48;

const CHIP_ICON_SIZE = 18;
const CONTENT_CONTAINER_STYLE = {paddingRight: 12};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    wrapper: {
        height: PLUGIN_ENTRIES_HEIGHT,
        justifyContent: 'center' as const,
    },
    chip: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
        height: 36,
        paddingHorizontal: 14,
        marginRight: 8,
        borderRadius: 18,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    chipPressed: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    icon: {
        width: CHIP_ICON_SIZE,
        height: CHIP_ICON_SIZE,
        borderRadius: 4,
    },
}));

type ChipProps = {
    entry: PluginMobileEntry;
    index: number;
    onPress: (entry: PluginMobileEntry) => void;
}

const PluginEntryChip = ({entry, index, onPress}: ChipProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onPress(entry);
    }, [entry, onPress]);

    // Plugins serve their own icon, so authors are not limited to the app's icon
    // set. Relative paths are resolved against the server; a bare name falls back
    // to a Compass glyph.
    const icon = entry.icon ?? '';
    const isAbsolute = icon.startsWith('http');
    const isRelative = icon.startsWith('/');
    const iconUri = isAbsolute ? icon : `${serverUrl}${icon}`;

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.chip, pressed && styles.chipPressed]}
            testID={`channel.quick_actions.plugin.${index}`}
        >
            <Text
                style={styles.label}
                numberOfLines={1}
            >
                {entry.label}
            </Text>
            {isAbsolute || isRelative ? (
                <Image
                    source={{uri: iconUri}}
                    style={styles.icon}
                />
            ) : (
                <CompassIcon
                    name={icon || 'power-plug-outline'}
                    size={CHIP_ICON_SIZE}
                    color={theme.centerChannelColor}
                />
            )}
        </Pressable>
    );
};

type Props = {
    entries: PluginMobileEntry[];
    onPress: (entry: PluginMobileEntry) => void;
}

const PluginEntries = ({entries, onPress}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={CONTENT_CONTAINER_STYLE}
            >
                {entries.map((entry, index) => {
                    // Bindings carry no stable identifier and two entries may point
                    // at the same URL, so position is the only unique key available.
                    // Safe here because the list is replaced wholesale on each fetch
                    // rather than reordered or spliced.
                    const key = `${index}-${entry.url}`;

                    return (
                        <PluginEntryChip
                            key={key}
                            entry={entry}
                            index={index}
                            onPress={onPress}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default PluginEntries;
