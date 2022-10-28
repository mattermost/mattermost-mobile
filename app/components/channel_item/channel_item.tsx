// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Badge from '@components/badge';
import ChannelIcon from '@components/channel_icon';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import CustomStatus from './custom_status';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    channel: ChannelModel;
    currentUserId: string;
    hasDraft: boolean;
    isActive: boolean;
    isInfo?: boolean;
    isMuted: boolean;
    membersCount: number;
    isUnread: boolean;
    mentionsCount: number;
    onPress: (channelId: string) => void;
    hasMember: boolean;
    teamDisplayName?: string;
    testID?: string;
    hasCall: boolean;
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
        paddingRight: 20,
    },
    highlight: {
        color: theme.sidebarUnreadText,
    },
    textInfo: {
        color: theme.centerChannelColor,
        paddingRight: 20,
    },
    muted: {
        color: changeOpacity(theme.sidebarText, 0.32),
    },
    mutedInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.32),
    },
    badge: {
        borderColor: theme.sidebarBg,
        position: 'relative',
        left: 0,
        top: -2,
        alignSelf: undefined,
    },
    infoBadge: {
        color: theme.buttonColor,
        backgroundColor: theme.buttonBg,
        borderColor: theme.centerChannelBg,
    },
    mutedBadge: {
        opacity: 0.32,
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
    teamNameMuted: {
        color: changeOpacity(theme.centerChannelColor, 0.32),
    },
    teamNameTablet: {
        marginLeft: -12,
        paddingLeft: 0,
        marginTop: 0,
        paddingBottom: 0,
        top: 5,
    },
    hasCall: {
        textAlign: 'right',
        paddingRight: 0,
    },
}));

export const textStyle = StyleSheet.create({
    bold: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

const ChannelListItem = ({
    channel, currentUserId, hasDraft,
    isActive, isInfo, isMuted, membersCount, hasMember,
    isUnread, mentionsCount, onPress, teamDisplayName, testID, hasCall}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    // Make it bolded if it has unreads or mentions
    const isBolded = isUnread || mentionsCount > 0;

    const height = useMemo(() => {
        let h = 40;
        if (isInfo) {
            h = (teamDisplayName && !isTablet) ? 58 : 44;
        }
        return h;
    }, [teamDisplayName, isInfo, isTablet]);

    const handleOnPress = useCallback(() => {
        onPress(channel.id);
    }, [channel.id]);

    const textStyles = useMemo(() => [
        isBolded && !isMuted ? textStyle.bold : textStyle.regular,
        styles.text,
        isBolded && styles.highlight,
        isActive && isTablet && !isInfo ? styles.textActive : null,
        isInfo ? styles.textInfo : null,
        isMuted && styles.muted,
        isMuted && isInfo && styles.mutedInfo,
    ], [isBolded, styles, isMuted, isActive, isInfo, isTablet]);

    const containerStyle = useMemo(() => [
        styles.container,
        isActive && isTablet && !isInfo && styles.activeItem,
        isInfo && styles.infoItem,
        {minHeight: height},
    ],
    [height, isActive, isTablet, isInfo, styles]);

    if (!hasMember) {
        return null;
    }

    const teammateId = (channel.type === General.DM_CHANNEL) ? getUserIdFromChannelName(currentUserId, channel.name) : undefined;
    const isOwnDirectMessage = (channel.type === General.DM_CHANNEL) && currentUserId === teammateId;

    let displayName = channel.displayName;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const channelItemTestId = `${testID}.${channel.name}`;

    return (
        <TouchableOpacity onPress={handleOnPress}>
            <>
                <View
                    style={containerStyle}
                    testID={channelItemTestId}
                >
                    <View style={styles.wrapper}>
                        <ChannelIcon
                            hasDraft={hasDraft}
                            isActive={isInfo ? false : isTablet && isActive}
                            isInfo={isInfo}
                            isUnread={isBolded}
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
                                testID={`${channelItemTestId}.display_name`}
                            >
                                {displayName}
                            </Text>
                            {isInfo && Boolean(teamDisplayName) && !isTablet &&
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={[styles.teamName, isMuted && styles.teamNameMuted]}
                                testID={`${channelItemTestId}.team_display_name`}
                            >
                                {teamDisplayName}
                            </Text>
                            }
                        </View>
                        {Boolean(teammateId) &&
                        <CustomStatus
                            isInfo={isInfo}
                            testID={channelItemTestId}
                            userId={teammateId!}
                        />
                        }
                        {isInfo && Boolean(teamDisplayName) && isTablet &&
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={[styles.teamName, styles.teamNameTablet, isMuted && styles.teamNameMuted]}
                            testID={`${channelItemTestId}.team_display_name`}
                        >
                            {teamDisplayName}
                        </Text>
                        }
                    </View>
                    <Badge
                        visible={mentionsCount > 0}
                        value={mentionsCount}
                        style={[styles.badge, isMuted && styles.mutedBadge, isInfo && styles.infoBadge]}
                    />
                    {hasCall &&
                        <CompassIcon
                            name='phone-in-talk'
                            size={16}
                            style={[...textStyles, styles.hasCall]}
                        />
                    }
                </View>
            </>
        </TouchableOpacity>
    );
};

export default ChannelListItem;
