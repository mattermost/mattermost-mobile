// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import ChannelIcon from '@components/channel_icon';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onPress: (channelId: string, displayName: string) => void;
    channel: Channel;
    teamDisplayName?: string;
    testID?: string;
}

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        minHeight: 44,
        alignItems: 'center',
        marginVertical: 2,
    },
    wrapper: {
        flex: 1,
        flexDirection: 'row',
    },
    text: {
        marginTop: -1,
        color: theme.centerChannelColor,
        paddingLeft: 12,
        paddingRight: 20,
        ...typography('Body', 200, 'Regular'),
    },
    teamName: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingLeft: 12,
        marginTop: 4,
        ...typography('Body', 75),
    },
    teamNameTablet: {
        marginLeft: -12,
        paddingLeft: 0,
        marginTop: 0,
        paddingBottom: 0,
        top: 5,
    },
}));

export const textStyle = StyleSheet.create({
    bright: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

const RemoteChannelItem = ({onPress, channel, teamDisplayName, testID}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const height = useMemo(() => {
        return (teamDisplayName && !isTablet) ? 58 : 44;
    }, [teamDisplayName, isTablet]);

    const handleOnPress = useCallback(() => {
        onPress(channel.id, channel.display_name);
    }, [channel]);

    const containerStyle = useMemo(() => [
        styles.container,
        {minHeight: height},
    ],
    [height, styles]);

    return (
        <TouchableOpacity onPress={handleOnPress}>
            <>
                <View
                    style={containerStyle}
                    testID={`${testID}.${channel.name}`}
                >
                    <View style={styles.wrapper}>
                        <ChannelIcon
                            isInfo={true}
                            isArchived={channel.delete_at > 0}
                            name={channel.name}
                            shared={channel.shared}
                            size={24}
                            type={channel.type}
                        />
                        <View>
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={styles.text}
                                testID={`${testID}.${channel.name}.display_name`}
                            >
                                {channel.display_name}
                            </Text>
                            {Boolean(teamDisplayName) && !isTablet &&
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={`${testID}.${teamDisplayName}.display_name`}
                                style={styles.teamName}
                            >
                                {teamDisplayName}
                            </Text>
                            }
                        </View>
                        {Boolean(teamDisplayName) && isTablet &&
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={`${testID}.${teamDisplayName}.display_name`}
                                style={[styles.teamName, styles.teamNameTablet]}
                            >
                                {teamDisplayName}
                            </Text>
                        }
                    </View>
                </View>
            </>
        </TouchableOpacity>
    );
};

export default RemoteChannelItem;
