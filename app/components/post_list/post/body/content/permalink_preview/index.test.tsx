// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {invalidateChannelRedaction, RedactionInvalidationReason} from '@actions/local/redaction';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkPreview from './permalink_preview';

import EnhancedPermalinkPreview from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

const createPostWithPermalinkEmbed = async (
    operator: ServerDataOperator,
    database: Database,
    embedData: PermalinkEmbedData,
): Promise<PostModel> => {
    const postWithPermalink = TestHelper.fakePost({
        id: `referencing-post-${Date.now()}`,
        metadata: {
            embeds: [{
                type: 'permalink' as PostEmbedType,
                url: '',
                data: embedData,
            }],
        },
    });

    const models = await operator.handlePosts({
        actionType: 'POSTS.RECEIVED_NEW' as 'POSTS.RECEIVED_NEW',
        order: [postWithPermalink.id],
        posts: [postWithPermalink],
        prepareRecordsOnly: true,
    });
    await operator.batchRecords(models, 'test');

    return await database.get('Post').find(postWithPermalink.id) as PostModel;
};

jest.mock('./permalink_preview', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(PermalinkPreview).mockImplementation((props) =>
    React.createElement('PermalinkPreview', {...props, testID: 'permalink-preview'}),
);

describe('PermalinkPreview Enhanced Component', () => {
    const serverUrl = 'server-1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        // Setup basic data
        await operator.handleConfigs({
            configs: [
                {id: 'EnablePermalinkPreviews', value: 'true'},
                {id: 'TeammateNameDisplay', value: 'username'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        // Add a current user
        const currentUser = TestHelper.fakeUser({id: 'current-user', locale: 'en'});
        await operator.handleUsers({users: [currentUser], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: currentUser.id}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should pass props to permalink preview component with post author', async () => {
        const authorUser = TestHelper.fakeUser({id: 'author-user', username: 'testauthor'});
        await operator.handleUsers({users: [authorUser], prepareRecordsOnly: false});

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const postWithPermalink = TestHelper.fakePost({
            id: 'referencing-post',
            metadata: {
                embeds: [{
                    type: 'permalink' as PostEmbedType,
                    url: '',
                    data: embedData,
                }],
            },
        });

        const models = await operator.handlePosts({
            actionType: 'POSTS.RECEIVED_NEW' as 'POSTS.RECEIVED_NEW',
            order: [postWithPermalink.id],
            posts: [postWithPermalink],
            prepareRecordsOnly: true,
        });
        await operator.batchRecords(models, 'test');

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeDefined();
            expect(permalinkPreview.props.currentUser).toBeDefined();
            expect(permalinkPreview.props.isMilitaryTime).toBe(false);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass props to permalink preview component without post author', async () => {
        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: '',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        await createPostWithPermalinkEmbed(operator, database, embedData);

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeUndefined();
            expect(permalinkPreview.props.currentUser).toBeDefined();
            expect(permalinkPreview.props.isMilitaryTime).toBe(false);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass props to permalink preview component with disabled link previews', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnablePermalinkPreviews', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        await createPostWithPermalinkEmbed(operator, database, embedData);

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.currentUser).toBeDefined();
            expect(permalinkPreview.props.isMilitaryTime).toBe(false);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass props to permalink preview component without post data', async () => {
        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        await createPostWithPermalinkEmbed(operator, database, embedData);

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeUndefined();
            expect(permalinkPreview.props.currentUser).toBeDefined();
            expect(permalinkPreview.props.isMilitaryTime).toBe(false);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass props to permalink preview component with different teammate name display', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'TeammateNameDisplay', value: 'full_name'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        await createPostWithPermalinkEmbed(operator, database, embedData);

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('full_name');
            expect(permalinkPreview.props.currentUser).toBeDefined();
            expect(permalinkPreview.props.isMilitaryTime).toBe(false);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass military time preference correctly', async () => {
        await operator.handlePreferences({
            preferences: [{
                category: 'display_settings',
                name: 'use_military_time',
                user_id: 'current-user',
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.isMilitaryTime).toBe(true);
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(false);
        });
    });

    it('should pass autotranslationsEnabled true when channel has autotranslation enabled', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnableAutoTranslation', value: 'true'},
                {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const channelId = 'channel-123';
        const channel = TestHelper.fakeChannel({id: channelId, team_id: 'team1', autotranslation: true});
        const myChannel = TestHelper.fakeMyChannel({
            id: channelId,
            channel_id: channelId,
            user_id: 'current-user',
            autotranslation_disabled: false,
        });
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [myChannel], prepareRecordsOnly: false});

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
                channel_id: channelId,
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: channelId,
        };

        await createPostWithPermalinkEmbed(operator, database, embedData);

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.autotranslationsEnabled).toBe(true);
        });
    });
    describe('hasLinkedPostFiles', () => {
        const embedFor = (metadata: PostMetadata): PermalinkEmbedData => ({
            post_id: 'linked-post',
            post: TestHelper.fakePost({id: 'linked-post', user_id: 'user-123', message: 'msg', metadata}),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        });

        const storeLinkedPost = async (metadata: PostMetadata) => {
            const models = await operator.handlePosts({
                actionType: 'POSTS.RECEIVED_NEW' as 'POSTS.RECEIVED_NEW',
                order: ['linked-post'],
                posts: [TestHelper.fakePost({id: 'linked-post', user_id: 'user-123', message: 'msg', metadata})],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');
        };

        const renderWith = (embedData: PermalinkEmbedData) => renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
            />,
            {database, serverUrl},
        );

        it('should be false when the embed reports redacted files, even with files stored for the linked post', async () => {
            const files = [TestHelper.fakeFileInfo({id: 'file-1', post_id: 'linked-post'})];
            await storeLinkedPost({files} as PostMetadata);

            const {getByTestId} = renderWith(embedFor({redacted_file_count: 1} as PostMetadata));

            await waitFor(() => {
                expect(getByTestId('permalink-preview').props.hasLinkedPostFiles).toBe(false);
            });
        });

        it('should fall back to the embed file list when the linked post is not stored yet', async () => {
            const files = [TestHelper.fakeFileInfo({id: 'file-2', post_id: 'linked-post'})];

            const {getByTestId} = renderWith(embedFor({files} as PostMetadata));

            await waitFor(() => {
                expect(getByTestId('permalink-preview').props.hasLinkedPostFiles).toBe(true);
            });
        });

        it('should be false when the linked post is not stored and the embed lists no files', async () => {
            const {getByTestId} = renderWith(embedFor({} as PostMetadata));

            await waitFor(() => {
                expect(getByTestId('permalink-preview').props.hasLinkedPostFiles).toBe(false);
            });
        });

        it('should use the stored files of the linked post once it exists', async () => {
            const files = [TestHelper.fakeFileInfo({id: 'file-3', post_id: 'linked-post'})];
            await storeLinkedPost({files} as PostMetadata);

            const {getByTestId} = renderWith(embedFor({files} as PostMetadata));

            await waitFor(() => {
                expect(getByTestId('permalink-preview').props.hasLinkedPostFiles).toBe(true);
            });
        });

        it('should be false when the linked post exists with no stored files', async () => {
            await storeLinkedPost({} as PostMetadata);

            const {getByTestId} = renderWith(embedFor({} as PostMetadata));

            await waitFor(() => {
                expect(getByTestId('permalink-preview').props.hasLinkedPostFiles).toBe(false);
            });
        });
    });
    it('should stop vouching for the embed once the linked channel requires a newer epoch than the host holds', async () => {
        // The server decides embed files against the linked post's channel, so a policy change scoped
        // to that channel must hide the embed even though the host's own channel did not move.
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        for (const id of ['host-channel', 'linked-channel']) {
            const channel = {id, team_id: 'team-id', total_msg_count: 0} as Channel;
            // eslint-disable-next-line no-await-in-loop
            await operator.handleMyChannel({channels: [channel], myChannels: [{id, channel_id: id, msg_count: 0} as ChannelMembership], prepareRecordsOnly: false});
        }

        const embedData: PermalinkEmbedData = {
            post_id: 'linked-post',
            post: TestHelper.fakePost({id: 'linked-post', channel_id: 'linked-channel'}),
            team_name: 'test-team',
            channel_display_name: 'Linked',
            channel_type: 'O',
            channel_id: 'linked-channel',
        };
        const host = TestHelper.fakePost({id: 'host-post', channel_id: 'host-channel'});
        await operator.handlePosts({
            actionType: 'POSTS.RECEIVED_NEW' as 'POSTS.RECEIVED_NEW',
            order: [host.id],
            posts: [host],
            prepareRecordsOnly: false,
            redactionVerifiedEpoch: 1,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview
                embedData={embedData}
                location={Screens.CHANNEL}
                parentPostId={host.id}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            expect(getByTestId('permalink-preview').props.isEmbedRedactionVerified).toBe(true);
        });

        const required = await invalidateChannelRedaction(serverUrl, 'linked-channel', RedactionInvalidationReason.ChannelPolicy);

        await waitFor(() => {
            expect(getByTestId('permalink-preview').props.isEmbedRedactionVerified).toBe(false);
            expect(getByTestId('permalink-preview').props.embedRequiredEpoch).toBe(required);
        });
    });
});
