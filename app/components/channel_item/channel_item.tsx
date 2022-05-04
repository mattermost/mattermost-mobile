// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Badge from '@components/badge';
import ChannelIcon from '@components/channel_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import CustomStatus from './custom_status';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

type Props = {
    channel: ChannelModel;
    collapsed: boolean;
    currentUserId: string;
    hasDraft: boolean;
    isActive: boolean;
    isInfo?: boolean;
    isMuted: boolean;
    isVisible: boolean;
    membersCount: number;
    myChannel?: MyChannelModel;
    onPress: (channelId: string) => void;
    teamDisplayName?: string;
    testID?: string;
}

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        minHeight: 40,
        alignItems: 'center',
    },
    infoItem: {
        paddingHorizontal: 0,
    },
    wrapper: {
        flex: 1,
        flexDirection: 'row',
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
    },
    highlight: {
        color: theme.sidebarText,
    },
    textInfo: {
        color: theme.centerChannelColor,
        paddingRight: 20,
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
    infoBadge: {
        color: theme.buttonColor,
        backgroundColor: theme.buttonBg,
        borderColor: theme.centerChannelBg,
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

const ChannelListItem = ({
    channel, collapsed, currentUserId, hasDraft,
    isActive, isInfo, isMuted, isVisible, membersCount,
    myChannel, onPress, teamDisplayName, testID}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    // Make it brighter if it's not muted, and highlighted or has unreads
    const isBright = !isMuted && (myChannel && (myChannel.isUnread || myChannel.mentionsCount > 0));

    const shouldCollapse = (collapsed && !isBright) && !isActive;
    const sharedValue = useSharedValue(shouldCollapse);
    const height = useMemo(() => {
        let h = 40;
        if (isInfo) {
            h = (teamDisplayName && !isTablet) ? 58 : 44;
        }
        return h;
    }, [teamDisplayName, isInfo, isTablet]);

    useEffect(() => {
        sharedValue.value = shouldCollapse;
    }, [shouldCollapse]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            marginVertical: withTiming(sharedValue.value ? 0 : 2, {duration: 500}),
            height: withTiming(sharedValue.value ? 0 : height, {duration: 500}),
            opacity: withTiming(sharedValue.value ? 0 : 1, {duration: 500, easing: Easing.inOut(Easing.exp)}),
        };
    }, [height]);

    const handleOnPress = useCallback(() => {
        onPress(myChannel?.id || channel.id);
    }, [channel.id, myChannel?.id]);

    const textStyles = useMemo(() => [
        isBright ? textStyle.bright : textStyle.regular,
        styles.text,
        isBright && styles.highlight,
        isMuted && styles.muted,
        isActive && !isInfo ? styles.textActive : null,
        isInfo ? styles.textInfo : null,
    ], [isBright, styles, isMuted, isActive, isInfo]);

    const containerStyle = useMemo(() => [
        styles.container,
        isActive && !isInfo && styles.activeItem,
        isInfo && styles.infoItem,
        {minHeight: height},
    ],
    [height, isActive, isInfo, styles]);

    if ((!isInfo && (channel.deleteAt > 0 && !isActive)) || !myChannel || !isVisible) {
        return null;
    }

    const teammateId = (channel.type === General.DM_CHANNEL) ? getUserIdFromChannelName(currentUserId, channel.name) : undefined;
    const isOwnDirectMessage = (channel.type === General.DM_CHANNEL) && currentUserId === teammateId;

    let displayName = channel.displayName;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity onPress={handleOnPress}>
                <>
                    <View
                        style={containerStyle}
                        testID={`${testID}.${channel.name}.collapsed.${collapsed && !isActive}`}
                    >
                        <View style={styles.wrapper}>
                            <ChannelIcon
                                hasDraft={hasDraft}
                                isActive={isInfo ? false : isActive}
                                isInfo={isInfo}
                                isUnread={isBright}
                                isArchived={channel.deleteAt > 0}
                                membersCount={membersCount}
                                name={channel.name}
                                shared={channel.shared}
                                size={24}
                                type={channel.type}
                                isMuted={isMuted}
                            />
                            <View>
                                <Text
                                    ellipsizeMode='tail'
                                    numberOfLines={1}
                                    style={textStyles}
                                    testID={`${testID}.${channel.name}.display_name`}
                                >
                                    {displayName}
                                </Text>
                                {isInfo && Boolean(teamDisplayName) && !isTablet &&
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
                            {Boolean(teammateId) &&
                                <CustomStatus
                                    isInfo={isInfo}
                                    userId={teammateId!}
                                />
                            }
                            {isInfo && Boolean(teamDisplayName) && isTablet &&
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
                        <Badge
                            visible={myChannel.mentionsCount > 0}
                            value={myChannel.mentionsCount}
                            style={[styles.badge, isMuted && styles.mutedBadge, isInfo && styles.infoBadge]}
                        />
                    </View>
                </>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default ChannelListItem;
