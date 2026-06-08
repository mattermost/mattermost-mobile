// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import React from 'react';

import {createDirectChannel} from '@actions/remote/channel';
import NetworkManager from '@managers/network_manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentChat from './agent_chat';

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type {Database} from '@nozbe/watermelondb';

const SERVER_URL = 'https://test-server.com';

// --- Context-enforcing mock for @gorhom/portal ---
// Mirrors the real library: Portal throws without PortalProvider ancestor.
// AgentChat itself renders a named PortalHost (not a PortalProvider) — the
// provider lives at the root layout in production. We must mock the package
// because it isn't in transformIgnorePatterns.
jest.mock('@gorhom/portal', () => {
    const ReactMock = require('react');
    const {View} = require('react-native');
    const PortalContext = ReactMock.createContext(null);
    return {
        PortalProvider: ({children}: {children: React.ReactNode}) => (
            <PortalContext.Provider value={{}}>{children}</PortalContext.Provider>
        ),
        PortalHost: () => <View testID='portal-host'/>,
        Portal: ({children}: {children: React.ReactNode}) => {
            const ctx = ReactMock.useContext(PortalContext);
            if (!ctx) {
                throw new Error("'PortalDispatchContext' cannot be null, please add 'PortalProvider' to the root component.");
            }
            return <View testID='portal'>{children}</View>;
        },
    };
});

// --- Context mocks ---
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => SERVER_URL),
    withServerUrl: (Component: React.ComponentType<any>) => (props: any) => (
        <Component
            {...props}
            serverUrl={SERVER_URL}
        />
    ),
}));

// --- Network / action mocks ---
jest.mock('@agents/actions/remote/bots', () => ({
    fetchAIBots: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@actions/remote/channel', () => ({
    createDirectChannel: jest.fn(() => Promise.resolve({data: {id: 'placeholder'}})),
    getChannelTimezones: jest.fn(() => Promise.resolve({channelTimezones: []})),
}));

jest.mock('@actions/remote/thread', () => ({
    fetchAndSwitchToThread: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@actions/remote/file', () => ({
    buildAbsoluteUrl: jest.fn(() => 'https://test-server.com/avatar.png'),
}));

jest.mock('@actions/remote/user', () => ({
    buildProfileImageUrl: jest.fn(() => '/api/v4/users/bot-123/image'),
}));

// --- Navigation mocks ---
jest.mock('@screens/navigation', () => ({
    popTopScreen: jest.fn(),
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    openAsBottomSheet: jest.fn(),
}));

jest.mock('@agents/screens/navigation', () => ({
    goToAgentThreadsList: jest.fn(),
}));

// --- Navigation state mocks ---
jest.mock('@react-navigation/native', () => ({
    useIsFocused: jest.fn(() => true),
}));

// scrollTo from react-native-reanimated logs a warning when called in Jest because
// it requires a native driver that isn't available in the test environment.
jest.mock('react-native-reanimated', () => ({
    ...jest.requireActual('react-native-reanimated/mock'),
    scrollTo: jest.fn(),
}));

// --- Native module mocks ---
jest.mock('@hooks/android_back_handler', () => jest.fn());

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: Function) => fn,
}));

jest.mock('@utils/post', () => ({
    persistentNotificationsConfirmation: jest.fn(),
}));

// --- UI mocks (SVG can't render in Jest) ---
jest.mock('@agents/components/illustrations', () => {
    const {View} = require('react-native');
    return {
        __esModule: true,
        default: () => <View testID='mock-agents-intro'/>,
    };
});

const mockBot = {
    id: 'bot-123',
    displayName: 'Test Agent',
    username: 'testagent',
    lastIconUpdate: 0,
    dmChannelId: 'dm-channel-123',
    channelAccessLevel: 0,
    channelIds: [],
    userAccessLevel: 0,
    userIds: [],
    teamIds: [],
} as unknown as AiBotModel;

describe('AgentChat', () => {
    let database: Database;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;

        // Use the fully-set-up channel from TestHelper (has channel info,
        // membership, etc.) so PostDraft's deep observable chain works.
        const channelId = TestHelper.basicChannel!.id;
        (createDirectChannel as jest.Mock).mockResolvedValue({data: {id: channelId}});
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(SERVER_URL);
    });

    it('should render PostDraft without error when channel is available', async () => {
        const {getByTestId} = renderWithEverything(
            <AgentChat bots={[mockBot]}/>,
            {database},
        );

        // Wait for async channel creation (createDirectChannel in useEffect)
        // then PostDraft mounts inside the full provider tree.
        // This exercises the real PostDraft → DraftHandler → SendHandler chain.
        // If any required provider (DatabaseProvider, ExtraKeyboardProvider, etc.)
        // is missing or breaks, this test fails.
        await waitFor(() => {
            expect(getByTestId('agent_chat.post_draft')).toBeTruthy();
        });

        // AgentChat renders a named PortalHost for autocomplete; the PortalProvider
        // itself lives at the root layout in production.
        expect(getByTestId('portal-host')).toBeTruthy();

        // Flush any remaining async state updates (e.g. fetchAIBots resolving after
        // the waitFor assertion passes) to prevent act() warnings.
        await act(async () => {});
    });

    it('should render intro screen when no bots are available', async () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <AgentChat bots={[]}/>,
            {database},
        );

        // Wait for loading state to resolve (fetchAIBots is async)
        await waitFor(() => {
            expect(getByTestId('mock-agents-intro')).toBeTruthy();
        });
        expect(queryByTestId('agent_chat.post_draft')).toBeNull();

        // Flush any remaining async state updates to prevent act() warnings.
        await act(async () => {});
    });
});
