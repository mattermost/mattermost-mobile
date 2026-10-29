// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform} from 'react-native';
import {Notification, Notifications} from 'react-native-notifications';

import {PushNotification} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getLocalizedMessage} from '@i18n';
import {isDirectNotificationServer} from '@managers/direct_notification/mode';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {getConfig} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {logWarning} from '@utils/log';
import {getNotificationProps} from '@utils/user';

import {hasExplicitMessageMention, shouldDeliverDirectNotification} from './filter';

const RECENT_POST_LIMIT = 256;
const recentPostIds: Record<string, Set<string>> = {};

function rememberPost(serverUrl: string, postId: string): boolean {
    const posts = recentPostIds[serverUrl] || new Set<string>();
    if (posts.has(postId)) {
        return false;
    }
    posts.add(postId);
    if (posts.size > RECENT_POST_LIMIT) {
        const oldest = posts.values().next().value;
        if (oldest) {
            posts.delete(oldest);
        }
    }
    recentPostIds[serverUrl] = posts;
    return true;
}

function forgetPost(serverUrl: string, postId: string): void {
    recentPostIds[serverUrl]?.delete(postId);
}

function getMessageBody(post: Post, contents: string, locale: string): string {
    if (contents === 'generic' || contents === 'id_loaded') {
        return getLocalizedMessage(locale, 'encma.direct_notification.new_message', 'New message');
    }
    if (post.message) {
        return post.message;
    }
    return getLocalizedMessage(locale, 'encma.direct_notification.new_message', 'New message');
}

/**
 * Called after the normal posted-event handler has ensured the channel,
 * author, and (when applicable) thread records exist locally.
 */
export async function handleDirectNotification(serverUrl: string, post: Post, msg: WebSocketMessage): Promise<void> {
    if (Platform.OS !== 'android' || !isDirectNotificationServer(serverUrl) || AppState.currentState === 'active') {
        return;
    }
    if (!post.id || !rememberPost(serverUrl, post.id)) {
        return;
    }

    try {
        const serverDatabase = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!serverDatabase) {
            forgetPost(serverUrl, post.id);
            return;
        }

        const [currentUser, channel, myChannel, isCRTEnabled, config] = await Promise.all([
            getCurrentUser(serverDatabase),
            getChannelById(serverDatabase, post.channel_id),
            getMyChannel(serverDatabase, post.channel_id),
            getIsCRTEnabled(serverDatabase),
            getConfig(serverDatabase),
        ]);
        if (!currentUser) {
            forgetPost(serverUrl, post.id);
            return;
        }

        let channelNotifyProps: Partial<ChannelNotifyProps> = {};
        try {
            channelNotifyProps = (await myChannel?.settings.fetch())?.notifyProps || {};
        } catch {
            // A missing settings relation has the same meaning as default
            // channel notification preferences.
        }

        let isFollowingThread = false;
        if (isCRTEnabled && post.root_id) {
            const thread = await getThreadById(serverDatabase, post.root_id);
            const followers = (msg.data as {followers?: string[]}).followers;
            isFollowingThread = thread ? thread.isFollowing : Boolean(followers?.includes(currentUser.id));
        }

        const data = msg.data as {
            mentions?: string[];
            channel_type?: ChannelType;
            channel_display_name?: string;
            channel_name?: string;
            sender_name?: string;
            team_id?: string;
        };
        const mentions = data.mentions || [];
        const channelType = channel?.type || data.channel_type;

        // A GM's WebSocket mention list contains every member. For an explicit
        // channel-level "mention" override, only message-level mention evidence
        // should qualify; the default GM preference is handled by the filter's
        // all-activity promotion.
        let effectiveMentions = mentions;
        if (channelType === 'G' && channelNotifyProps.push === 'mention') {
            effectiveMentions = hasExplicitMessageMention(post, currentUser.mentionKeys, currentUser.username) ? [currentUser.id] : [];
        }

        const shouldDeliver = shouldDeliverDirectNotification({
            post,
            currentUserId: currentUser.id,
            userNotifyProps: getNotificationProps(currentUser),
            channelNotifyProps,
            channelType,
            isCRTEnabled,
            isFollowingThread,
            mentions: effectiveMentions,
            status: currentUser.status,
        });
        if (!shouldDeliver) {
            return;
        }

        const channelName = data.channel_display_name || channel?.displayName || data.channel_name || '';
        const senderName = data.sender_name || post.user_id;
        const contents = (config as ClientConfig & {PushNotificationContents?: string} | undefined)?.PushNotificationContents || 'full';
        const body = getMessageBody(post, contents, currentUser.locale || DEFAULT_LOCALE);
        const payload = {
            identifier: post.id,
            'google.message_id': post.id,
            body,
            category: PushNotification.CATEGORY,
            channel_id: post.channel_id,
            channel_name: channelName,
            encma_direct: 'true',
            is_crt_enabled: String(isCRTEnabled),
            message: body,
            post_id: post.id,
            root_id: post.root_id || '',
            sender_id: post.user_id,
            sender_name: senderName,
            server_url: serverUrl,
            team_id: channel?.teamId || data.team_id || '',
            title: channelName || senderName,
            type: PushNotification.NOTIFICATION_TYPE.MESSAGE,
            version: '2',
        };

        // CustomPushNotification recognizes encma_direct and uses the stable
        // post ID for native grouping/deduplication. Do not mark this as a
        // userInfo.local notification: taps must use the normal channel-open
        // navigation path.
        Notifications.postLocalNotification(new Notification(payload));
    } catch (error) {
        forgetPost(serverUrl, post.id);
        logWarning('Direct notification display failed', error);
    }
}

export function clearDirectNotificationHistory(serverUrl?: string): void {
    if (serverUrl) {
        delete recentPostIds[serverUrl];
    } else {
        for (const url of Object.keys(recentPostIds)) {
            delete recentPostIds[url];
        }
    }
}
