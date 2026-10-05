// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {Events} from '@constants';
import {navigateBack} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import AgentThreadsList from './agent_threads_list';

import type AiThreadModel from '@agents/types/database/models/ai_thread';

const SERVER_URL = 'https://test-server.com';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => SERVER_URL),
}));

jest.mock('@agents/actions/remote/bots', () => ({
    fetchAIBots: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@agents/actions/remote/threads', () => ({
    fetchAIThreads: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@actions/remote/thread', () => ({
    fetchAndSwitchToThread: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => jest.fn());

const mockThread = {
    id: 'thread-123',
    channelId: 'channel-456',
    title: 'Test Conversation',
    turnCount: 2,
    updateAt: Date.now(),
} as unknown as AiThreadModel;

describe('AgentThreadsList', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should emit AGENT_NEW_CHAT and navigate back when the new chat button is pressed', async () => {
        const newChatListener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.AGENT_NEW_CHAT, newChatListener);

        const {getByTestId} = renderWithIntlAndTheme(
            <AgentThreadsList
                threads={[mockThread]}
                bots={[]}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('agent_threads_list.new_chat_button')).toBeTruthy();
        });

        fireEvent.press(getByTestId('agent_threads_list.new_chat_button'));

        expect(newChatListener).toHaveBeenCalledTimes(1);
        expect(navigateBack).toHaveBeenCalledTimes(1);

        subscription.remove();
        await act(async () => {});
    });

    it('should not emit AGENT_NEW_CHAT when exiting via the back button', async () => {
        const newChatListener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.AGENT_NEW_CHAT, newChatListener);

        const {getByTestId} = renderWithIntlAndTheme(
            <AgentThreadsList
                threads={[mockThread]}
                bots={[]}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('agent_threads_list.back_button')).toBeTruthy();
        });

        fireEvent.press(getByTestId('agent_threads_list.back_button'));

        expect(newChatListener).not.toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalledTimes(1);

        subscription.remove();
        await act(async () => {});
    });

    it('should open the selected thread when a history row is pressed', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AgentThreadsList
                threads={[mockThread]}
                bots={[]}
            />,
        );

        await waitFor(() => {
            expect(getByTestId(`agent_thread.${mockThread.id}`)).toBeTruthy();
        });

        fireEvent.press(getByTestId(`agent_thread.${mockThread.id}`));

        await waitFor(() => {
            expect(fetchAndSwitchToThread).toHaveBeenCalledWith(SERVER_URL, mockThread.id, false);
        });

        await act(async () => {});
    });
});
