// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import {loopInAgent} from '@agents/actions/remote/loop_in_agent';
import loopInStore from '@agents/store/loop_in_store';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentMentionReminderPost from './index';

import type PostModel from '@typings/database/models/servers/post';

const SERVER_URL = 'https://test.mattermost.com';

jest.mock('@agents/actions/remote/loop_in_agent', () => ({
    loopInAgent: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.mattermost.com',
}));

// Identity so the only re-entry guard exercised is the component's own pending
// check, not the double-tap debounce.
jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: Function) => fn,
}));

const LINK_TESTID = 'agents.agent_mention_reminder_post.loop_in_link';
const botProps = {bot_username: 'ai-bot', bot_display_name: 'AI Bot', target_post_id: 'target-1'};

const makePost = (props: Record<string, unknown>, message = 'raw reminder message'): PostModel =>
    TestHelper.fakePostModel({id: 'reminder-1', message, props}) as PostModel;

beforeEach(() => {
    jest.clearAllMocks();

    // Real store (not mocked) so the remount-persistence behavior is exercised;
    // clear it between tests so a looped-in target from one test doesn't leak.
    loopInStore.removeServer(SERVER_URL);
});

describe('AgentMentionReminderPost', () => {
    it('should render the loop-in link using the bot display name in the idle state', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost(botProps)}/>);

        expect(getByTestId('agents.agent_mention_reminder_post')).toBeTruthy();
        expect(getByText('click here to loop in @AI Bot')).toBeTruthy();
    });

    it('should fall back to the bot username when no display name is provided', () => {
        const {getByText} = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost({bot_username: 'ai-bot', target_post_id: 'target-1'})}/>);

        expect(getByText('click here to loop in @ai-bot')).toBeTruthy();
    });

    it('should render the raw message with no link when there is no bot username', () => {
        const {getByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentMentionReminderPost post={makePost({}, 'You must @mention an agent.')}/>,
        );

        expect(getByText('You must @mention an agent.')).toBeTruthy();
        expect(queryByTestId(LINK_TESTID)).toBeNull();
    });

    it('should render the raw message with no link when the target post id is missing', () => {
        const {getByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentMentionReminderPost post={makePost({bot_username: 'ai-bot'}, 'You must @mention an agent.')}/>,
        );

        // Without a target post id there is nothing to loop the agent into, so the
        // interactive link is suppressed rather than retargeting the reminder itself.
        expect(getByText('You must @mention an agent.')).toBeTruthy();
        expect(queryByTestId(LINK_TESTID)).toBeNull();
    });

    it('should fire loop-in once, guard re-entry while pending, then show the confirmation on success', async () => {
        let resolveLoop: (value: {error?: unknown}) => void = () => {};
        (loopInAgent as jest.Mock).mockReturnValue(new Promise((resolve) => {
            resolveLoop = resolve;
        }));

        const {getByTestId, getByText, queryByText} = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost(botProps)}/>);

        await act(async () => {
            fireEvent.press(getByTestId(LINK_TESTID));
        });

        // Pending: the request fired once with the target post id + bot username,
        // and the confirmation is not shown yet.
        expect(loopInAgent).toHaveBeenCalledTimes(1);
        expect(loopInAgent).toHaveBeenCalledWith('https://test.mattermost.com', 'target-1', 'ai-bot');
        expect(queryByText('Looped in @AI Bot.')).toBeNull();

        // A second tap while pending is a no-op.
        await act(async () => {
            fireEvent.press(getByTestId(LINK_TESTID));
        });
        expect(loopInAgent).toHaveBeenCalledTimes(1);

        // Resolving the request flips to the done confirmation.
        await act(async () => {
            resolveLoop({});
        });
        expect(getByText('Looped in @AI Bot.')).toBeTruthy();
    });

    it('should show an error message when the loop-in request fails', async () => {
        (loopInAgent as jest.Mock).mockResolvedValue({error: 'boom'});

        const {getByTestId, getByText} = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost(botProps)}/>);

        await act(async () => {
            fireEvent.press(getByTestId(LINK_TESTID));
        });

        expect(getByText('Failed to loop in @AI Bot. Please try again.')).toBeTruthy();
    });

    it('should keep showing the confirmation after the row is recycled (remount)', async () => {
        (loopInAgent as jest.Mock).mockResolvedValue({});

        const first = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost(botProps)}/>);
        await act(async () => {
            fireEvent.press(first.getByTestId(LINK_TESTID));
        });
        expect(first.getByText('Looped in @AI Bot.')).toBeTruthy();
        first.unmount();

        // A fresh mount of the same reminder (the post scrolled back into view)
        // reads the looped-in state from the session store instead of resetting
        // to an actionable link.
        const remounted = renderWithIntlAndTheme(<AgentMentionReminderPost post={makePost(botProps)}/>);
        expect(remounted.getByText('Looped in @AI Bot.')).toBeTruthy();
        expect(remounted.queryByTestId(LINK_TESTID)).toBeNull();
    });
});
