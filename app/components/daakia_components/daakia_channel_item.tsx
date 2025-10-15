// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {of as of$} from 'rxjs';
import {map} from 'rxjs/operators';

import ChannelIcon from '@components/channel_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
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
};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    avatar: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
    nameUnread: {
        ...typography('Body', 200, 'SemiBold'),
    },
    time: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    lastMessage: {
        ...typography('Body', 100),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    unreadBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.buttonBg,
        marginLeft: 8,
    },
    channelAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: changeOpacity(theme.buttonBg, 0.16),
        justifyContent: 'center',
        alignItems: 'center',
    },
    channelAvatarUnread: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.24),
    },
    channelInitials: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.buttonBg,
    },
}));

const DaakiaChannelItem = ({channel, isUnread, onPress, currentUserId, lastPost, isMilitaryTime, lastPostSender, locale, teammateDisplayNameSetting}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    let displayName = channel.displayName || channel.name || 'Unknown Channel';
    const channelType = channel.type || 'O';

    // Check if it's a DM with yourself (same logic as original)
    const teammateId = (channelType === General.DM_CHANNEL) ? getUserIdFromChannelName(currentUserId, channel.name) : undefined;
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
            style={styles.container}
            onPress={() => onPress(channel)}
            testID={`daakia_channel_item.${channel.id}`}
        >
            <View style={styles.avatar}>
                {channelType === 'D' || channelType === 'G' ? (
                    <ChannelIcon
                        name={channel.name}
                        shared={channel.shared}
                        size={40}
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
                    <Text
                        style={[styles.name, isUnread && styles.nameUnread]}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
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

const enhanced = withObservables(['lastPost'], ({database, lastPost}: WithDatabaseArgs & {lastPost?: PostModel}) => {
    const preferences = queryDisplayNamePreferences(database).observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(
        map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')),
    );

    const teammateDisplayNameSetting = preferences.pipe(
        map((prefs) => (getDisplayNamePreferenceAsBool(prefs, 'teammate_name_display') ? 'username' : 'full_name')),
    );

    const lastPostSender = lastPost?.userId ? observeUser(database, lastPost.userId) : of$(undefined);

    return {
        isMilitaryTime,
        lastPostSender,
        teammateDisplayNameSetting,
    };
});

export default withDatabase(enhanced(DaakiaChannelItem));
