// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import AgentPost from '@agents/components/agent_post';
import {AGENT_POST_TYPES} from '@agents/constants';
import UnrevealedBurnOnReadPost from '@components/post_list/post/burn_on_read/unrevealed';
import SystemHeader from '@components/system_header';
import {Screens} from '@constants';
import {PostTypes} from '@constants/post';
import NetworkManager from '@managers/network_manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {getPostById} from '@queries/servers/post';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Avatar from './avatar';
import Body from './body';
import Header from './header';
import Post from './post';

import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

jest.mock('@managers/performance_metrics_manager');
jest.mock('@agents/components/agent_post', () => jest.fn(() => null));
jest.mock('@components/post_list/post/burn_on_read/unrevealed');
jest.mock('@components/system_header', () => jest.fn());
jest.mock('./avatar', () => jest.fn());
jest.mock('./body', () => jest.fn());
jest.mock('./header', () => jest.fn());

describe('performance metrics', () => {
    let database: Database;
    let post: PostModel;

    function getBaseProps(): ComponentProps<typeof Post> {
        return {
            appsEnabled: false,
            mmBlocksEnabled: false,
            canDelete: false,
            customEmojiNames: [],
            filesInfo: [],
            hasReactions: false,
            hasReplies: false,
            highlightReplyBar: false,
            isEphemeral: false,
            isPostAddChannelMember: false,
            commentCount: 0,
            location: Screens.CHANNEL,
            post,
            isLastPost: true,
            isChannelAutotranslated: false,
        };
    }

    const serverUrl = 'http://www.someserverurl.com';
    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
        post = (await getPostById(database, TestHelper.basicPost!.id))!;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('do not call the performance metrics if it is not the last post', async () => {
        const props = getBaseProps();
        props.isLastPost = false;
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).not.toHaveBeenCalled();
            expect(PerformanceMetricsManager.endMetric).not.toHaveBeenCalled();
        });
    });
    it('on channel', async () => {
        const props = getBaseProps();
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('CHANNEL', serverUrl);
            expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
        });
    });
    it('on thread', async () => {
        const props = getBaseProps();
        props.location = Screens.THREAD;
        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('THREAD', serverUrl);
            expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
        });
    });

    it('should render unrevealed post correctly', async () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            props: {
                expire_at: Date.now() + 1000000,
            },
        });

        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(UnrevealedBurnOnReadPost).toHaveBeenCalled();
        });
    });

    it('own BoR post should show as revealed even without metadata', async () => {
        const currentUser = TestHelper.fakeUserModel();
        const props = {
            ...getBaseProps(),
            currentUser,
        };
        props.post = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            userId: currentUser.id,
            props: {
                expire_at: Date.now() + 1000000,
            },
        });

        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(Body).toHaveBeenCalled();
        });
        expect(UnrevealedBurnOnReadPost).not.toHaveBeenCalled();
    });
});

describe('ephemeral post header', () => {
    let database: Database;

    function getBaseProps(): ComponentProps<typeof Post> {
        return {
            appsEnabled: false,
            mmBlocksEnabled: false,
            canDelete: false,
            customEmojiNames: [],
            filesInfo: [],
            hasReactions: false,
            hasReplies: false,
            highlightReplyBar: false,
            isEphemeral: true,
            isPostAddChannelMember: false,
            commentCount: 0,
            location: Screens.CHANNEL,
            post: TestHelper.fakePostModel({
                type: PostTypes.EPHEMERAL,
                userId: 'user-id',
            }),
            isLastPost: false,
            isChannelAutotranslated: false,
        };
    }

    const serverUrl = 'http://www.someserverurl.com';

    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('should render author header when ephemeral post has a user id', async () => {
        renderWithEverything(<Post {...getBaseProps()}/>, {database, serverUrl});
        await waitFor(() => {
            expect(Header).toHaveBeenCalled();
            expect(Avatar).toHaveBeenCalled();
        });
        expect(SystemHeader).not.toHaveBeenCalled();
    });

    it('should render system header when ephemeral post has no user id', async () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            type: PostTypes.EPHEMERAL,
            userId: '',
        });

        renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(SystemHeader).toHaveBeenCalled();
        });
        expect(Header).not.toHaveBeenCalled();
        expect(Avatar).not.toHaveBeenCalled();
    });
});

describe('reply bar', () => {
    let database: Database;

    function getBaseProps(): ComponentProps<typeof Post> {
        return {
            appsEnabled: false,
            mmBlocksEnabled: false,
            canDelete: false,
            customEmojiNames: [],
            filesInfo: [],
            hasReactions: false,
            hasReplies: false,
            highlightReplyBar: false,
            isEphemeral: false,
            isPostAddChannelMember: false,
            commentCount: 0,
            location: Screens.CHANNEL,
            post: TestHelper.fakePostModel({
                type: AGENT_POST_TYPES.LLMBOT,
                rootId: 'root-post-id',
            }),
            isLastPost: false,
            isChannelAutotranslated: false,
        };
    }

    const serverUrl = 'http://www.someserverurl.com';

    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('should render the reply bar for an agent reply in the channel and tell the agent post it is a reply', async () => {
        const {getByTestId} = renderWithEverything(<Post {...getBaseProps()}/>, {database, serverUrl});
        await waitFor(() => {
            expect(AgentPost).toHaveBeenCalledWith(expect.objectContaining({isReplyPost: true}), undefined);
        });
        expect(Body).not.toHaveBeenCalled();
        expect(getByTestId('post.reply_bar')).toBeTruthy();
    });

    it('should render the reply bar for an agent mention reminder reply in the channel', async () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            type: AGENT_POST_TYPES.AGENT_MENTION_REMINDER,
            rootId: 'root-post-id',
            props: {bot_username: 'agent', target_post_id: 'target-post-id'},
        });
        const {getByTestId} = renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(getByTestId('agents.agent_mention_reminder_post')).toBeTruthy();
        });
        expect(getByTestId('post.reply_bar')).toBeTruthy();
    });

    it('should not render the reply bar for a root post', async () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({type: AGENT_POST_TYPES.LLMBOT, rootId: ''});
        const {queryByTestId} = renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(AgentPost).toHaveBeenCalledWith(expect.objectContaining({isReplyPost: false}), undefined);
        });
        expect(queryByTestId('post.reply_bar')).toBeNull();
    });

    it('should not render the reply bar for a reply in the thread screen', async () => {
        const props = getBaseProps();
        props.location = Screens.THREAD;
        const {queryByTestId} = renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(AgentPost).toHaveBeenCalledWith(expect.objectContaining({isReplyPost: false}), undefined);
        });
        expect(queryByTestId('post.reply_bar')).toBeNull();
    });

    it('should not render the reply bar in a permalink when CRT is enabled', async () => {
        const props = getBaseProps();
        props.location = Screens.PERMALINK;
        props.isCRTEnabled = true;
        const {queryByTestId} = renderWithEverything(<Post {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(AgentPost).toHaveBeenCalled();
        });
        expect(queryByTestId('post.reply_bar')).toBeNull();
    });
});
