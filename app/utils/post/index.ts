// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, type AlertButton} from 'react-native';

import {getUsersCountFromMentions} from '@actions/local/post';
import {General, Post} from '@constants';
import {SPECIAL_MENTIONS_REGEX} from '@constants/autocomplete';
import {POST_TIME_TO_FAIL} from '@constants/post';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE} from '@i18n';
import {getUserById} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';
import {displayUsername, getUserIdFromChannelName} from '@utils/user';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {IntlShape} from 'react-intl';

export function areConsecutivePosts(post: PostModel, previousPost: PostModel) {
    let consecutive = false;

    if (post && previousPost) {
        const postFromWebhook = Boolean(post?.props?.from_webhook); // eslint-disable-line camelcase
        const prevPostFromWebhook = Boolean(previousPost?.props?.from_webhook); // eslint-disable-line camelcase
        const isFromSameUser = previousPost.userId === post.userId;
        const isNotSystemMessage = !isSystemMessage(post) && !isSystemMessage(previousPost);
        const isInTimeframe = (post.createAt - previousPost.createAt) <= Post.POST_COLLAPSE_TIMEOUT;

        // Were the last post and this post made by the same user within some time?
        consecutive = previousPost && isFromSameUser && isInTimeframe && !postFromWebhook &&
        !prevPostFromWebhook && isNotSystemMessage;
    }

    return consecutive;
}

export function isFromWebhook(post: PostModel | Post): boolean {
    return post.props && post.props.from_webhook === 'true';
}

export function isEdited(post: PostModel): boolean {
    return post.editAt > 0;
}

export function isPostEphemeral(post: PostModel): boolean {
    return post.type === Post.POST_TYPES.EPHEMERAL || post.type === Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL || post.deleteAt > 0;
}

export function isPostFailed(post: PostModel): boolean {
    return post.props?.failed || ((post.pendingPostId === post.id) && (Date.now() > post.updateAt + POST_TIME_TO_FAIL));
}

export function isPostPendingOrFailed(post: PostModel): boolean {
    return post.pendingPostId === post.id || isPostFailed(post);
}

export function isSystemMessage(post: PostModel | Post): boolean {
    return Boolean(post.type && post.type?.startsWith(Post.POST_TYPES.SYSTEM_MESSAGE_PREFIX));
}

export function fromAutoResponder(post: PostModel): boolean {
    return Boolean(post.type && (post.type === Post.POST_TYPES.SYSTEM_AUTO_RESPONDER));
}

export function postUserDisplayName(post: PostModel, author?: UserModel, teammateNameDisplay?: string, enablePostUsernameOverride = false) {
    if (isFromWebhook(post) && post.props?.override_username && enablePostUsernameOverride) {
        return post.props.override_username;
    }

    return displayUsername(author, author?.locale || DEFAULT_LOCALE, teammateNameDisplay, true);
}

export function shouldIgnorePost(post: Post): boolean {
    return Post.IGNORE_POST_TYPES.includes(post.type);
}

export const processPostsFetched = (data: PostResponse) => {
    const order = data.order;
    const posts = Object.values(data.posts);
    const previousPostId = data.prev_post_id;

    return {
        posts,
        order,
        previousPostId,
    };
};

export const getLastFetchedAtFromPosts = (posts?: Post[]) => {
    return posts?.reduce((timestamp: number, p) => {
        const maxTimestamp = Math.max(p.create_at, p.update_at, p.delete_at);
        return Math.max(maxTimestamp, timestamp);
    }, 0) || 0;
};

export const moreThan5minAgo = (time: number) => {
    return Date.now() - time > toMilliseconds({minutes: 5});
};

export function hasSpecialMentions(message: string): boolean {
    const result = SPECIAL_MENTIONS_REGEX.test(message);

    // https://stackoverflow.com/questions/1520800/why-does-a-regexp-with-global-flag-give-wrong-results
    SPECIAL_MENTIONS_REGEX.lastIndex = 0;
    return result;
}

export async function persistentNotificationsConfirmation(serverUrl: string, value: string, mentionsList: string[], intl: IntlShape, sendMessage: () => void, persistentNotificationMaxRecipients: number, persistentNotificationInterval: number, currentUserId: string, channelName?: string, channelType?: ChannelType) {
    let title = '';
    let description = '';
    let buttons: AlertButton[] = [{
        text: intl.formatMessage({
            id: 'persistent_notifications.error.okay',
            defaultMessage: 'Okay',
        }),
        style: 'cancel',
    }];

    if (channelType === General.DM_CHANNEL) {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teammateId = getUserIdFromChannelName(currentUserId, channelName!);
        const user = await getUserById(database, teammateId);

        title = intl.formatMessage({
            id: 'persistent_notifications.confirm.title',
            defaultMessage: 'Send persistent notifications',
        });
        description = intl.formatMessage({
            id: 'persistent_notifications.dm_channel.description',
            defaultMessage: '@{username} will be notified every {interval, plural, one {minute} other {{interval} minutes}} until they’ve acknowledged or replied to the message.',
        }, {
            interval: persistentNotificationInterval,
            username: user?.username,
        });
        buttons = [{
            text: intl.formatMessage({
                id: 'persistent_notifications.confirm.cancel',
                defaultMessage: 'Cancel',
            }),
            style: 'cancel',
        },
        {
            text: intl.formatMessage({
                id: 'persistent_notifications.confirm.send',
                defaultMessage: 'Send',
            }),
            onPress: sendMessage,
        }];
    } else if (hasSpecialMentions(value)) {
        description = intl.formatMessage({
            id: 'persistent_notifications.error.special_mentions',
            defaultMessage: 'Cannot use @channel, @all or @here to mention recipients of persistent notifications.',
        });
    } else {
        // removes the @ from the mention
        const formattedMentionsList = mentionsList.map((mention) => mention.slice(1));
        const usersCount = await getUsersCountFromMentions(serverUrl, formattedMentionsList);
        if (usersCount === 0) {
            title = intl.formatMessage({
                id: 'persistent_notifications.error.no_mentions.title',
                defaultMessage: 'Recipients must be @mentioned',
            });
            description = intl.formatMessage({
                id: 'persistent_notifications.error.no_mentions.description',
                defaultMessage: 'There are no recipients mentioned in your message. You’ll need add mentions to be able to send persistent notifications.',
            });
        } else if (usersCount > persistentNotificationMaxRecipients) {
            title = intl.formatMessage({
                id: 'persistent_notifications.error.max_recipients.title',
                defaultMessage: 'Too many recipients',
            });
            description = intl.formatMessage({
                id: 'persistent_notifications.error.max_recipients.description',
                defaultMessage: 'You can send persistent notifications to a maximum of {max} recipients. There are {count} recipients mentioned in your message. You’ll need to change who you’ve mentioned before you can send.',
            }, {
                max: persistentNotificationMaxRecipients,
                count: mentionsList.length,
            });
        } else {
            title = intl.formatMessage({
                id: 'persistent_notifications.confirm.title',
                defaultMessage: 'Send persistent notifications',
            });
            description = intl.formatMessage({
                id: 'persistent_notifications.confirm.description',
                defaultMessage: 'Mentioned recipients will be notified every {interval, plural, one {minute} other {{interval} minutes}} until they’ve acknowledged or replied to the message.',
            }, {
                interval: persistentNotificationInterval,
            });

            buttons = [{
                text: intl.formatMessage({
                    id: 'persistent_notifications.confirm.cancel',
                    defaultMessage: 'Cancel',
                }),
                style: 'cancel',
            },
            {
                text: intl.formatMessage({
                    id: 'persistent_notifications.confirm.send',
                    defaultMessage: 'Send',
                }),
                onPress: sendMessage,
            }];
        }
    }

    Alert.alert(
        title,
        description,
        buttons,
    );
}
