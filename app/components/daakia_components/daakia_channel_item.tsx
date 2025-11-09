// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {observeChannelsWithCalls} from '@calls/state';
import ChannelIcon from '@components/channel_icon';
import CustomStatus from '@components/channel_item/custom_status';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {withServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getFormattedTime} from '@utils/time';
import {getDeviceTimezone} from '@utils/timezone';
import {typography} from '@utils/typography';
import {displayUsername, getUserIdFromChannelName} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    isUnread: boolean;
    onPress: (channel: ChannelModel) => void;
    currentUserId: string;
    lastPost?: PostModel;
    isMilitaryTime: boolean;
    lastPostSender?: UserModel;
    locale: string;
    teammateDisplayNameSetting: string;
    hasCall: boolean;
    teammateId?: string;
};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        backgroundColor: theme.centerChannelBg,
    },
    containerActive: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
    },
    avatar: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    name: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
        flexShrink: 1,
    },
    nameUnread: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    time: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginLeft: 4,
    },
    lastMessage: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.56),
        lineHeight: 18,
    },
    unreadBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.buttonBg,
        marginLeft: 6,
        alignSelf: 'center',
    },
    unreadIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: theme.buttonBg,
    },
    channelAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    channelAvatarUnread: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.16),
    },
    channelInitials: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.buttonBg,
    },
    hasCall: {
        textAlign: 'right',
        marginRight: 8,
    },
    filler: {
        flex: 1,
        marginRight: 8,
        minWidth: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    customStatus: {
        marginLeft: 4,
    },
}));

const DaakiaChannelItem = ({channel, isUnread, onPress, currentUserId, lastPost, isMilitaryTime, lastPostSender, locale, teammateDisplayNameSetting, hasCall, teammateId}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    let displayName = channel.displayName || channel.name || 'Unknown Channel';
    const channelType = channel.type || 'O';

    // Check if it's a DM with yourself (same logic as original)
    // Note: teammateId is now passed as a prop from the observable
    const isOwnDirectMessage = (channelType === General.DM_CHANNEL) && currentUserId === teammateId;

    if (isOwnDirectMessage) {
        displayName = `${displayName} (you)`;
    }

    // Get last message preview with sender name for channels
    const getLastMessagePreview = () => {
        if (!lastPost) {
            return 'No messages yet...';
        }

        let messageText = '';

        // Always show the message text if it exists (regardless of type)
        if (lastPost.message) {
            // Regular text message
            messageText = lastPost.message.replace(/\n/g, ' ').trim();
        } else if (lastPost.type && lastPost.type.startsWith('system_')) {
            // Only show "System message" if there's no message text
            messageText = 'System message';
        } else {
            messageText = 'Message';
        }

        // For channels (not DMs), prepend sender name
        const isChannel = channelType === 'O' || channelType === 'P';
        if (isChannel && lastPost.userId) {
            let senderPrefix = '';

            if (lastPost.userId === currentUserId) {
                senderPrefix = 'you: ';
            } else if (lastPostSender) {
                const senderName = displayUsername(lastPostSender, locale, teammateDisplayNameSetting);
                senderPrefix = `${senderName}: `;
            }

            return senderPrefix + messageText;
        }

        return messageText;
    };

    // Format time with user's clock preference (12hr or 24hr) and device timezone
    const getTimeDisplay = () => {
        if (!lastPost) {
            return '';
        }

        const deviceTimezone = getDeviceTimezone();
        const time = getFormattedTime(isMilitaryTime, deviceTimezone, lastPost.createAt);

        return time;
    };

    return (
        <TouchableOpacity
            style={[styles.container, isUnread && styles.containerActive]}
            onPress={() => onPress(channel)}
            activeOpacity={0.7}
            testID={`daakia_channel_item.${channel.id}`}
        >
            {isUnread && <View style={styles.unreadIndicator}/>}
            <View style={styles.avatar}>
                {channelType === 'D' || channelType === 'G' ? (
                    <ChannelIcon
                        name={channel.name}
                        shared={channel.shared}
                        size={48}
                        type={channelType}
                        isUnread={isUnread}
                        isOnCenterBg={true}
                    />
                ) : (
                    <View style={[styles.channelAvatar, isUnread && styles.channelAvatarUnread]}>
                        <Text style={styles.channelInitials}>
                            {(channel.displayName || channel.name || '').substring(0, 2).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.nameRow}>
                        <Text
                            style={[styles.name, isUnread && styles.nameUnread]}
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>
                        {teammateId && (
                            <CustomStatus
                                userId={teammateId}
                                style={styles.customStatus}
                            />
                        )}
                    </View>
                    <View style={styles.filler}/>
                    {hasCall &&
                        <CompassIcon
                            name='phone-in-talk'
                            size={16}
                            color={theme.centerChannelColor}
                            style={styles.hasCall}
                        />
                    }
                    <View style={styles.row}>
                        <Text style={styles.time}>
                            {getTimeDisplay()}
                        </Text>
                        {isUnread && <View style={styles.unreadBadge}/>}
                    </View>
                </View>

                <Text
                    style={styles.lastMessage}
                    numberOfLines={1}
                >
                    {getLastMessagePreview()}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const enhanced = withObservables(['lastPost', 'channel'], ({database, lastPost, channel, serverUrl}: WithDatabaseArgs & {lastPost?: PostModel; channel: ChannelModel; serverUrl: string}) => {
    const preferences = queryDisplayNamePreferences(database).observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(
        map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')),
    );

    const teammateDisplayNameSetting = preferences.pipe(
        map((prefs) => (getDisplayNamePreferenceAsBool(prefs, 'teammate_name_display') ? 'username' : 'full_name')),
    );

    const lastPostSender = lastPost?.userId ? observeUser(database, lastPost.userId) : of$(undefined);

    const hasCall = observeChannelsWithCalls(serverUrl || '').pipe(
        switchMap((calls) => of$(Boolean(calls[channel.id]))),
        distinctUntilChanged(),
    );

    // Get teammateId for DMs to show custom status
    const currentUserId = observeCurrentUserId(database);
    const channelType = channel.type || 'O';
    const teammateId = (channelType === General.DM_CHANNEL) ? currentUserId.pipe(
        switchMap((userId) => {
            const otherUserId = getUserIdFromChannelName(userId, channel.name);
            return of$(otherUserId);
        }),
    ) : of$(undefined);

    return {
        isMilitaryTime,
        lastPostSender,
        teammateDisplayNameSetting,
        hasCall,
        teammateId,
    };
});

export default withDatabase(withServerUrl(enhanced(DaakiaChannelItem)));
