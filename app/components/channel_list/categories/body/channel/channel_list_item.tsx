// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import Badge from '@components/badge';
import ChannelIcon from '@components/channel_icon';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingLeft: 2,
        height: 40,
        alignItems: 'center',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    text: {
        marginTop: -1,
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
        flex: 1,
    },
    highlight: {
        color: theme.sidebarText,
    },
    muted: {
        color: changeOpacity(theme.sidebarText, 0.4),
    },
    badge: {
        position: 'relative',
        borderWidth: 0,
        left: 0,
        top: 0,
        alignSelf: undefined,
    },
    mutedBadge: {
        opacity: 0.4,
    },
}));

const textStyle = StyleSheet.create({
    bright: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

type Props = {
    channel: Pick<ChannelModel, 'deleteAt' | 'displayName' | 'name' | 'shared' | 'type'>;
    isActive: boolean;
    isOwnDirectMessage: boolean;
    isMuted: boolean;
    myChannel?: MyChannelModel;
    collapsed: boolean;
}

const ChannelListItem = ({channel, isActive, isOwnDirectMessage, isMuted, myChannel, collapsed}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    // Make it brighter if it's not muted, and highlighted or has unreads
    const bright = !isMuted && (isActive || (myChannel && (myChannel.isUnread || myChannel.mentionsCount > 0)));

    const sharedValue = useSharedValue(collapsed && !bright);

    useEffect(() => {
        sharedValue.value = collapsed && !bright;
    }, [collapsed, bright]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            marginVertical: withTiming(sharedValue.value ? 0 : 2, {duration: 500}),
            height: withTiming(sharedValue.value ? 0 : 40, {duration: 500}),
            opacity: withTiming(sharedValue.value ? 0 : 1, {duration: 500, easing: Easing.inOut(Easing.exp)}),
        };
    });

    const switchChannels = () => {
        if (myChannel) {
            switchToChannelById(serverUrl, myChannel.id);
        }
    };
    const membersCount = useMemo(() => {
        if (channel.type === General.GM_CHANNEL) {
            return channel.displayName?.split(',').length;
        }
        return 0;
    }, [channel.type, channel.displayName]);

    const textStyles = useMemo(() => [
        bright ? textStyle.bright : textStyle.regular,
        styles.text,
        bright && styles.highlight,
        isMuted && styles.muted,
    ], [bright, styles, isMuted]);

    let displayName = channel.displayName;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    if ((channel.deleteAt > 0 && !isActive) || !myChannel) {
        return null;
    }

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity onPress={switchChannels}>
                <View style={styles.container}>
                    <ChannelIcon
                        isActive={isActive}
                        isArchived={channel.deleteAt > 0}
                        membersCount={membersCount}
                        name={channel.name}
                        shared={channel.shared}
                        size={24}
                        type={channel.type}
                        isMuted={isMuted}
                    />
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={textStyles}
                    >
                        {displayName}
                    </Text>
                    <Badge
                        visible={myChannel.mentionsCount > 0}
                        value={myChannel.mentionsCount}
                        style={[styles.badge, isMuted && styles.mutedBadge]}
                    />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default ChannelListItem;
