// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import {isDMorGM} from '@app/utils/channel';
import Badge from '@components/badge';
import ChannelIcon from '@components/channel_icon';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import {ChannelBody} from './channel_body';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    channel: ChannelModel | Channel;
    currentUserId: string;
    hasDraft: boolean;
    isActive: boolean;
    isMuted: boolean;
    membersCount: number;
    isUnread: boolean;
    mentionsCount: number;
    onPress: (channel: ChannelModel | Channel) => void;
    hasMember: boolean;
    teamDisplayName?: string;
    testID?: string;
    hasCall: boolean;
    onCenterBg?: boolean;
    showChannelName?: boolean;
}

export const ROW_HEIGHT = 40;
export const ROW_HEIGHT_WITH_TEAM = 58;

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 12,
    },
    text: {
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    highlight: {
        color: theme.sidebarUnreadText,
    },
    textOnCenterBg: {
        color: theme.centerChannelColor,
    },
    muted: {
        color: changeOpacity(theme.sidebarText, 0.32),
    },
    mutedOnCenterBg: {
        color: changeOpacity(theme.centerChannelColor, 0.32),
    },
    badge: {
        borderColor: theme.sidebarBg,

        //Overwrite default badge styles
        position: undefined,
        top: undefined,
        left: undefined,
        alignSelf: undefined,
    },
    badgeOnCenterBg: {
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
    },
    textActive: {
        color: theme.sidebarText,
    },
    hasCall: {
        textAlign: 'right',
    },
}));

export const textStyle = StyleSheet.create({
    bold: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

const ChannelItem = ({
    channel,
    currentUserId,
    hasDraft,
    isActive,
    isMuted,
    membersCount,
    hasMember,
    isUnread,
    mentionsCount,
    onPress,
    teamDisplayName = '',
    testID,
    hasCall,
    onCenterBg = false,
    showChannelName = false,
}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const channelName = (showChannelName && !isDMorGM(channel)) ? channel.name : '';

    // Make it bolded if it has unreads or mentions
    const isBolded = isUnread || mentionsCount > 0;

    const teammateId = (channel.type === General.DM_CHANNEL) ? getUserIdFromChannelName(currentUserId, channel.name) : undefined;
    const isOwnDirectMessage = (channel.type === General.DM_CHANNEL) && currentUserId === teammateId;

    let displayName = 'displayName' in channel ? channel.displayName : channel.display_name;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const deleteAt = 'deleteAt' in channel ? channel.deleteAt : channel.delete_at;
    const channelItemTestId = `${testID}.${channel.name}`;

    const height = useMemo(() => {
        return (teamDisplayName && !isTablet) ? ROW_HEIGHT_WITH_TEAM : ROW_HEIGHT;
    }, [teamDisplayName, isTablet]);

    const handleOnPress = useCallback(() => {
        onPress(channel);
    }, [channel.id]);

    const textStyles = useMemo(() => [
        isBolded && !isMuted ? textStyle.bold : textStyle.regular,
        styles.text,
        isBolded && styles.highlight,
        isActive && isTablet ? styles.textActive : null,
        onCenterBg ? styles.textOnCenterBg : null,
        isMuted && styles.muted,
        isMuted && onCenterBg && styles.mutedOnCenterBg,
    ], [isBolded, styles, isMuted, isActive, isTablet, onCenterBg]);

    const containerStyle = useMemo(() => [
        styles.container,
        isActive && isTablet && styles.activeItem,
        {minHeight: height},
    ], [height, isActive, isTablet, styles]);

    if (!hasMember) {
        return null;
    }

    return (
        <TouchableOpacity onPress={handleOnPress}>
            <View
                style={containerStyle}
                testID={channelItemTestId}
            >
                <ChannelIcon
                    hasDraft={hasDraft}
                    isActive={isTablet && isActive}
                    onCenterBg={onCenterBg}
                    isUnread={isBolded}
                    isArchived={deleteAt > 0}
                    membersCount={membersCount}
                    name={channel.name}
                    shared={channel.shared}
                    size={24}
                    type={channel.type}
                    isMuted={isMuted}
                    style={styles.icon}
                />
                <ChannelBody
                    displayName={displayName}
                    isMuted={isMuted}
                    teamDisplayName={teamDisplayName}
                    teammateId={teammateId}
                    testId={channelItemTestId}
                    textStyles={textStyles}
                    channelName={channelName}
                />
                <View style={{flex: 1}}/>
                <Badge
                    visible={mentionsCount > 0}
                    value={mentionsCount}
                    style={[styles.badge, isMuted && styles.mutedBadge, onCenterBg && styles.badgeOnCenterBg]}
                />
                {hasCall &&
                <CompassIcon
                    name='phone-in-talk'
                    size={16}
                    style={[...textStyles, styles.hasCall]}
                />
                }
            </View>
        </TouchableOpacity>
    );
};

export default ChannelItem;
