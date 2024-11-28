// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';

import {getUsersCountFromMentions} from '@actions/local/post';
import {General, Post} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {getUserById} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';

import {
    areConsecutivePosts,
    isFromWebhook,
    isEdited,
    isPostEphemeral,
    isPostFailed,
    isPostPendingOrFailed,
    isSystemMessage,
    fromAutoResponder,
    postUserDisplayName,
    shouldIgnorePost,
    processPostsFetched,
    getLastFetchedAtFromPosts,
    moreThan5minAgo,
    hasSpecialMentions,
    persistentNotificationsConfirmation,
} from '.';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

jest.mock('@actions/local/post', () => ({
    getUsersCountFromMentions: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    getUserById: jest.fn(),
}));

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn().mockReturnValue({
        database: {},
    }),
}));

describe('post utils', () => {
    describe('areConsecutivePosts', () => {
        it('should return true for consecutive posts from the same user within the collapse timeout', () => {
            const post = {
                userId: 'user1',
                createAt: 1000,
                props: {},
            } as PostModel;
            const previousPost = {
                userId: 'user1',
                createAt: 500,
                props: {},
            } as PostModel;

            const result = areConsecutivePosts(post, previousPost);
            expect(result).toBe(true);
        });

        it('should return false for posts from different users', () => {
            const post = {
                userId: 'user1',
                createAt: 1000,
                props: {},
            } as PostModel;
            const previousPost = {
                userId: 'user2',
                createAt: 500,
                props: {},
            } as PostModel;

            const result = areConsecutivePosts(post, previousPost);
            expect(result).toBe(false);
        });
    });

    describe('isFromWebhook', () => {
        it('should return true for posts from a webhook', () => {
            const post = {
                props: {
                    from_webhook: 'true',
                } as Record<string, unknown>,
            } as PostModel;

            const result = isFromWebhook(post);
            expect(result).toBe(true);
        });

        it('should return false for posts not from a webhook', () => {
            const post = {
                props: {
                    from_webhook: 'false',
                } as Record<string, unknown>,
            } as PostModel;

            const result = isFromWebhook(post);
            expect(result).toBe(false);
        });
    });

    describe('isEdited', () => {
        it('should return true if the post is edited', () => {
            const post = {
                editAt: 1000,
            } as PostModel;

            const result = isEdited(post);
            expect(result).toBe(true);
        });

        it('should return false if the post is not edited', () => {
            const post = {
                editAt: 0,
            } as PostModel;

            const result = isEdited(post);
            expect(result).toBe(false);
        });
    });

    describe('isPostEphemeral', () => {
        it('should return true for an ephemeral post', () => {
            const post = {
                type: Post.POST_TYPES.EPHEMERAL,
            } as PostModel;

            const result = isPostEphemeral(post);
            expect(result).toBe(true);
        });

        it('should return false for a non-ephemeral post', () => {
            const post = {
                type: 'normal',
            } as PostModel;

            const result = isPostEphemeral(post);
            expect(result).toBe(false);
        });
    });

    describe('isPostFailed', () => {
        it('should return true if the post has failed prop', () => {
            const post = {
                props: {
                    failed: true,
                } as Record<string, unknown>,
                pendingPostId: 'id',
                id: 'id',
                updateAt: Date.now() - Post.POST_TIME_TO_FAIL - 1000,
            } as PostModel;

            const result = isPostFailed(post);
            expect(result).toBe(true);
        });

        it('should return true if the post is pending and the update time has exceeded the failure time', () => {
            const post = {
                props: {},
                pendingPostId: 'id',
                id: 'id',
                updateAt: Date.now() - Post.POST_TIME_TO_FAIL - 1000,
            } as PostModel;

            const result = isPostFailed(post);
            expect(result).toBe(true);
        });

        it('should return false if the post is not failed', () => {
            const post = {
                props: {},
                pendingPostId: 'id',
                id: 'id',
                updateAt: Date.now(),
            } as PostModel;

            const result = isPostFailed(post);
            expect(result).toBe(false);
        });
    });

    describe('isPostPendingOrFailed', () => {
        it('should return true if the post is pending', () => {
            const post = {
                pendingPostId: 'id',
                id: 'id',
                props: {},
            } as PostModel;

            const result = isPostPendingOrFailed(post);
            expect(result).toBe(true);
        });

        it('should return true if the post has failed', () => {
            const post = {
                pendingPostId: 'id',
                id: 'id',
                updateAt: Date.now() - Post.POST_TIME_TO_FAIL - 1000,
                props: {},
            } as PostModel;

            const result = isPostPendingOrFailed(post);
            expect(result).toBe(true);
        });

        it('should return false if the post is neither pending nor failed', () => {
            const post = {
                pendingPostId: 'differentId',
                id: 'id',
                props: {},
            } as PostModel;

            const result = isPostPendingOrFailed(post);
            expect(result).toBe(false);
        });
    });

    describe('isSystemMessage', () => {
        it('should return true if the post is a system message', () => {
            const post = {
                type: `${Post.POST_TYPES.SYSTEM_MESSAGE_PREFIX}any_type`,
            } as PostModel;

            const result = isSystemMessage(post);
            expect(result).toBe(true);
        });

        it('should return false if the post is not a system message', () => {
            const post = {
                type: 'normal_type',
            } as PostModel;

            const result = isSystemMessage(post);
            expect(result).toBe(false);
        });
    });

    describe('hasSpecialMentions', () => {
        test.each([
            ['@here where is Jessica Hyde', true],
            ['@all where is Jessica Hyde', true],
            ['@channel where is Jessica Hyde', true],

            ['where is Jessica Hyde @here', true],
            ['where is Jessica Hyde @all', true],
            ['where is Jessica Hyde @channel', true],

            ['where is Jessica @here Hyde', true],
            ['where is Jessica @all Hyde', true],
            ['where is Jessica @channel Hyde', true],

            ['where is Jessica Hyde\n@here', true],
            ['where is Jessica Hyde\n@all', true],
            ['where is Jessica Hyde\n@channel', true],

            ['where is Jessica\n@here Hyde', true],
            ['where is Jessica\n@all Hyde', true],
            ['where is Jessica\n@channel Hyde', true],

            ['where is Jessica Hyde @her', false],
            ['where is Jessica Hyde @al', false],
            ['where is Jessica Hyde @chann', false],

            ['where is Jessica Hyde@here', false],
            ['where is Jessica Hyde@all', false],
            ['where is Jessica Hyde@channel', false],

            ['where is Jessica @hereHyde', false],
            ['where is Jessica @allHyde', false],
            ['where is Jessica @channelHyde', false],

            ['@herewhere is Jessica Hyde@here', false],
            ['@allwhere is Jessica Hyde@all', false],
            ['@channelwhere is Jessica Hyde@channel', false],

            ['where is Jessica Hyde here', false],
            ['where is Jessica Hyde all', false],
            ['where is Jessica Hyde channel', false],

            ['where is Jessica Hyde', false],
        ])('hasSpecialMentions: %s => %s', (message, expected) => {
            expect(hasSpecialMentions(message)).toBe(expected);
        });
    });

    describe('fromAutoResponder', () => {
        it('should return true if the post is from an auto responder', () => {
            const post = {
                type: Post.POST_TYPES.SYSTEM_AUTO_RESPONDER,
            } as PostModel;

            const result = fromAutoResponder(post);
            expect(result).toBe(true);
        });

        it('should return false if the post is not from an auto responder', () => {
            const post = {
                type: 'normal_type',
            } as PostModel;

            const result = fromAutoResponder(post);
            expect(result).toBe(false);
        });
    });

    describe('persistentNotificationsConfirmation', () => {
        const serverUrl = 'http://server';
        const value = '@user';
        const mentionsList = ['@user'];
        const sendMessage = jest.fn();
        const persistentNotificationMaxRecipients = 10;
        const persistentNotificationInterval = 5;
        const currentUserId = 'current_user_id';
        const channelName = 'channel_id__teammate_id';
        const intl = createIntl({locale: DEFAULT_LOCALE, messages: getTranslations(DEFAULT_LOCALE)});

        it('should show alert with DM channel description when channelType is DM_CHANNEL', async () => {
            const mockUser = {username: 'teammate'};
            (getUserById as jest.Mock).mockResolvedValue(mockUser);

            await persistentNotificationsConfirmation(
                serverUrl,
                value,
                mentionsList,
                intl,
                sendMessage,
                persistentNotificationMaxRecipients,
                persistentNotificationInterval,
                currentUserId,
                channelName,
                General.DM_CHANNEL,
            );

            expect(Alert.alert).toHaveBeenCalledWith(
                intl.formatMessage({
                    id: 'persistent_notifications.confirm.title',
                    defaultMessage: 'Send persistent notifications',
                }),
                intl.formatMessage({
                    id: 'persistent_notifications.dm_channel.description',
                    defaultMessage: '@{username} will be notified every {interval, plural, one {minute} other {{interval} minutes}} until they’ve acknowledged or replied to the message.',
                }, {
                    interval: persistentNotificationInterval,
                    username: mockUser.username,
                }),
                expect.any(Array),
            );
        });

        it('should show alert when special mentions are present', async () => {
            await persistentNotificationsConfirmation(
                serverUrl,
                '@channel',
                mentionsList,
                intl,
                sendMessage,
                persistentNotificationMaxRecipients,
                persistentNotificationInterval,
                currentUserId,
                channelName,
            );

            expect(Alert.alert).toHaveBeenCalledWith(
                '',
                intl.formatMessage({
                    id: 'persistent_notifications.error.special_mentions',
                    defaultMessage: 'Cannot use @channel, @all or @here to mention recipients of persistent notifications.',
                }),
                expect.any(Array),
            );
        });

        it('should show alert when no mentions found', async () => {
            (getUsersCountFromMentions as jest.Mock).mockResolvedValue(0);

            await persistentNotificationsConfirmation(
                serverUrl,
                value,
                mentionsList,
                intl,
                sendMessage,
                persistentNotificationMaxRecipients,
                persistentNotificationInterval,
                currentUserId,
                channelName,
            );

            expect(Alert.alert).toHaveBeenCalledWith(
                intl.formatMessage({
                    id: 'persistent_notifications.error.no_mentions.title',
                    defaultMessage: 'Recipients must be @mentioned',
                }),
                intl.formatMessage({
                    id: 'persistent_notifications.error.no_mentions.description',
                    defaultMessage: 'There are no recipients mentioned in your message. You’ll need add mentions to be able to send persistent notifications.',
                }),
                expect.any(Array),
            );
        });

        it('should show alert when mentions exceed max recipients', async () => {
            (getUsersCountFromMentions as jest.Mock).mockResolvedValue(15);

            await persistentNotificationsConfirmation(
                serverUrl,
                value,
                mentionsList,
                intl,
                sendMessage,
                persistentNotificationMaxRecipients,
                persistentNotificationInterval,
                currentUserId,
                channelName,
            );

            expect(Alert.alert).toHaveBeenCalledWith(
                intl.formatMessage({
                    id: 'persistent_notifications.error.max_recipients.title',
                    defaultMessage: 'Too many recipients',
                }),
                intl.formatMessage({
                    id: 'persistent_notifications.error.max_recipients.description',
                    defaultMessage: 'You can send persistent notifications to a maximum of {max} recipients. There are {count} recipients mentioned in your message. You’ll need to change who you’ve mentioned before you can send.',
                }, {
                    max: persistentNotificationMaxRecipients,
                    count: mentionsList.length,
                }),
                expect.any(Array),
            );
        });

        it('should show confirmation alert for valid mentions within limit', async () => {
            (getUsersCountFromMentions as jest.Mock).mockResolvedValue(5);

            await persistentNotificationsConfirmation(
                serverUrl,
                value,
                mentionsList,
                intl,
                sendMessage,
                persistentNotificationMaxRecipients,
                persistentNotificationInterval,
                currentUserId,
                channelName,
            );

            expect(Alert.alert).toHaveBeenCalledWith(
                intl.formatMessage({
                    id: 'persistent_notifications.confirm.title',
                    defaultMessage: 'Send persistent notifications',
                }),
                intl.formatMessage({
                    id: 'persistent_notifications.confirm.description',
                    defaultMessage: 'Mentioned recipients will be notified every {interval, plural, one {minute} other {{interval} minutes}} until they’ve acknowledged or replied to the message.',
                }, {
                    interval: persistentNotificationInterval,
                }),
                expect.any(Array),
            );
        });
    });

    describe('postUserDisplayName', () => {
        it('should return the override username if from webhook and override is enabled', () => {
            const post = {
                props: {
                    from_webhook: 'true',
                    override_username: 'webhook_user',
                } as Record<string, unknown>,
            } as PostModel;

            const result = postUserDisplayName(post, undefined, undefined, true);
            expect(result).toBe('webhook_user');
        });

        it('should return the author’s display name if not from webhook or override is disabled', () => {
            const post = {
                props: {
                    from_webhook: 'false',
                } as Record<string, unknown>,
            } as PostModel;
            const author = {
                username: 'user1',
                locale: 'en',
            } as UserModel;

            const result = postUserDisplayName(post, author, undefined, false);
            expect(result).toBe('user1');
        });

        it('should return the author’s display name using the teammate name display', () => {
            const post = {
                props: {
                    from_webhook: 'false',
                } as Record<string, unknown>,
            } as PostModel;
            const author = {
                username: 'user1',
                locale: 'en',
            } as UserModel;

            const result = postUserDisplayName(post, author, 'nickname', false);
            expect(result).toBe('user1');
        });
    });

    describe('shouldIgnorePost', () => {
        it('should return true if the post type is in the ignore list', () => {
            const post = {
                type: Post.POST_TYPES.CHANNEL_DELETED,
            } as Post;

            const result = shouldIgnorePost(post);
            expect(result).toBe(true);
        });

        it('should return false if the post type is not in the ignore list', () => {
            const post = {
                type: Post.POST_TYPES.EPHEMERAL,
            } as Post;

            const result = shouldIgnorePost(post);
            expect(result).toBe(false);
        });
    });

    describe('processPostsFetched', () => {
        it('should process the fetched posts correctly', () => {
            const data = {
                order: ['post1', 'post2'],
                posts: {
                    post1: {id: 'post1', message: 'First post'},
                    post2: {id: 'post2', message: 'Second post'},
                },
                prev_post_id: 'post0',
            } as unknown as PostResponse;

            const result = processPostsFetched(data);
            expect(result).toEqual({
                posts: [
                    {id: 'post1', message: 'First post'},
                    {id: 'post2', message: 'Second post'},
                ],
                order: ['post1', 'post2'],
                previousPostId: 'post0',
            });
        });
    });

    describe('getLastFetchedAtFromPosts', () => {
        it('should return the maximum timestamp from the posts', () => {
            const posts = [
                {create_at: 1000, update_at: 2000, delete_at: 0},
                {create_at: 1500, update_at: 2500, delete_at: 3000},
            ] as Post[];

            const result = getLastFetchedAtFromPosts(posts);
            expect(result).toBe(3000);
        });

        it('should return 0 if no posts are provided', () => {
            const result = getLastFetchedAtFromPosts();
            expect(result).toBe(0);
        });
    });

    describe('moreThan5minAgo', () => {
        it('should return true if the time is more than 5 minutes ago', () => {
            const time = Date.now() - toMilliseconds({minutes: 6});
            const result = moreThan5minAgo(time);
            expect(result).toBe(true);
        });

        it('should return false if the time is within 5 minutes', () => {
            const time = Date.now() - toMilliseconds({minutes: 4});
            const result = moreThan5minAgo(time);
            expect(result).toBe(false);
        });
    });
});
