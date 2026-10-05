// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import {postCustomPrompt} from '@agents/actions/remote/custom_prompts';
import {removeCustomPromptsServer, setCustomPromptsState} from '@agents/store/custom_prompts_store';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import CustomPromptPills from './index';

import type {CustomPrompt} from '@agents/types/api';

const SERVER_URL = 'https://test.mattermost.com';

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.mattermost.com',
}));
jest.mock('@agents/actions/remote/custom_prompts', () => ({
    fetchCustomPrompts: jest.fn().mockResolvedValue({}),
    postCustomPrompt: jest.fn(),
}));

function makePrompt(id: string, name: string): CustomPrompt {
    return {id, creator_id: 'u', name, description: '', template: '', is_shared: false, created_at: 0, updated_at: 0, deleted_at: 0};
}

describe('CustomPromptPills', () => {
    const onPostCreated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
        setCustomPromptsState(SERVER_URL, {
            prompts: [makePrompt('p1', 'Standup'), makePrompt('p2', 'Retro'), makePrompt('p3', 'Unpinned')],
            pinnedPromptIds: ['p1', 'p2'],
        });
    });

    afterEach(() => {
        removeCustomPromptsServer(SERVER_URL);
    });

    function renderPills() {
        return renderWithIntlAndTheme(
            <CustomPromptPills
                channelId='dm1'
                botUsername='agent'
                onPostCreated={onPostCreated}
            />,
        );
    }

    it('should show only pinned prompts', () => {
        const {getByTestId, queryByTestId} = renderPills();

        expect(getByTestId('agents.custom_prompts.pill.p1')).toBeTruthy();
        expect(getByTestId('agents.custom_prompts.pill.p2')).toBeTruthy();
        expect(queryByTestId('agents.custom_prompts.pill.p3')).toBeNull();
    });

    it('should render nothing when no prompt is pinned', () => {
        setCustomPromptsState(SERVER_URL, {pinnedPromptIds: []});
        const {queryByTestId} = renderPills();

        expect(queryByTestId('agents.custom_prompts.pills')).toBeNull();
    });

    it('should post the prompt to the agent DM and hand over the created post', async () => {
        jest.mocked(postCustomPrompt).mockResolvedValue({postId: 'post1'});
        const {getByTestId} = renderPills();

        await act(async () => {
            fireEvent.press(getByTestId('agents.custom_prompts.pill.p1'));
        });

        expect(postCustomPrompt).toHaveBeenCalledWith(SERVER_URL, 'p1', 'dm1', 'agent');
        expect(onPostCreated).toHaveBeenCalledWith('post1');
    });

    it('should alert instead of switching when posting fails', async () => {
        jest.mocked(postCustomPrompt).mockResolvedValue({error: 'boom'});
        const {getByTestId} = renderPills();

        await act(async () => {
            fireEvent.press(getByTestId('agents.custom_prompts.pill.p1'));
        });

        expect(Alert.alert).toHaveBeenCalledWith('Unable to run prompt', expect.any(String));
        expect(onPostCreated).not.toHaveBeenCalled();
    });

    it('should post only one prompt when two pills are tapped before a re-render', async () => {
        jest.mocked(postCustomPrompt).mockResolvedValue({postId: 'post1'});
        const {getByTestId} = renderPills();

        await act(async () => {
            fireEvent.press(getByTestId('agents.custom_prompts.pill.p1'));
            fireEvent.press(getByTestId('agents.custom_prompts.pill.p2'));
        });

        expect(postCustomPrompt).toHaveBeenCalledTimes(1);
    });

    it('should not hand a late post to the conversation after the pills unmount', async () => {
        let resolvePost: (value: {postId: string}) => void = () => undefined;
        jest.mocked(postCustomPrompt).mockImplementation(() => new Promise((resolve) => {
            resolvePost = resolve;
        }));
        const {getByTestId, unmount} = renderPills();

        fireEvent.press(getByTestId('agents.custom_prompts.pill.p1'));
        unmount();
        await act(async () => {
            resolvePost({postId: 'post1'});
        });

        expect(onPostCreated).not.toHaveBeenCalled();
    });
});
