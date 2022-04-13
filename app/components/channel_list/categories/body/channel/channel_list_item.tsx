// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import Badge from '@components/badge';
import ChannelIcon from '@components/channel_icon';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 20,
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
        left: 0,
        top: 0,
        alignSelf: undefined,
    },
    mutedBadge: {
        opacity: 0.4,
    },
    activeItem: {
        backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.1),
        borderLeftColor: theme.sidebarTextActiveBorder,
        borderLeftWidth: 5,
        marginLeft: 0,
        paddingLeft: 14,
    },
    textActive: {
        color: theme.sidebarText,
    },

}));

const textStyle = StyleSheet.create({
    bright: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

type Props = {
    channel: ChannelModel;
    isActive: boolean;
    isMuted: boolean;
    myChannel?: MyChannelModel;
    collapsed: boolean;
    currentUserId: string;
    testID?: string;
}

const ChannelListItem = ({channel, isActive, currentUserId, isMuted, myChannel, collapsed, testID}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const isOwnDirectMessage = (channel.type === General.DM_CHANNEL) && currentUserId === getUserIdFromChannelName(currentUserId, channel.name);

    // Make it brighter if it's not muted, and highlighted or has unreads
    const isUnread = !isMuted && (myChannel && (myChannel.isUnread || myChannel.mentionsCount > 0));

    const shouldCollapse = (collapsed && !isUnread) && !isActive;
    const sharedValue = useSharedValue(shouldCollapse);

    useEffect(() => {
        sharedValue.value = shouldCollapse;
    }, [shouldCollapse]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            marginVertical: withTiming(sharedValue.value ? 0 : 2, {duration: 500}),
            height: withTiming(sharedValue.value ? 0 : 40, {duration: 500}),
            opacity: withTiming(sharedValue.value ? 0 : 1, {duration: 500, easing: Easing.inOut(Easing.exp)}),
        };
    });

    const switchChannels = useCallback(() => {
        if (myChannel) {
            switchToChannelById(serverUrl, myChannel.id);
        }
    }, [myChannel?.id, serverUrl]);

    const membersCount = useMemo(() => {
        if (channel.type === General.GM_CHANNEL) {
            return channel.displayName.split(',').length;
        }
        return 0;
    }, [channel.type, channel.displayName]);

    const textStyles = useMemo(() => [
        isUnread ? textStyle.bright : textStyle.regular,
        styles.text,
        isUnread && styles.highlight,
        isMuted && styles.muted,
        isActive ? styles.textActive : null,
    ], [isUnread, styles, isMuted]);

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
                <View
                    style={[styles.container, isActive && styles.activeItem]}
                    testID={`${testID}.${channel.name}.collapsed.${collapsed && !isActive}`}
                >
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
                        testID={`${testID}.${channel.name}.display_name`}
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
