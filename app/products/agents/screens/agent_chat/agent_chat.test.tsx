// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {waitFor} from '@testing-library/react-native';
import React from 'react';

import {createDirectChannel} from '@actions/remote/channel';
import {Screens} from '@constants';
import NetworkManager from '@managers/network_manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentChat from './agent_chat';

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type {Database} from '@nozbe/watermelondb';

const SERVER_URL = 'https://test-server.com';

// --- Context-enforcing mock for @gorhom/portal ---
// Mirrors the real library: Portal throws without PortalProvider ancestor.
// PortalProvider sets a flag so we can assert it was rendered — Autocomplete's
// Portal is conditional (focused + Android) so the context check alone isn't
// enough to catch a missing PortalProvider in all test runs.
// We must mock because the package isn't in transformIgnorePatterns.
let portalProviderRendered = false;
jest.mock('@gorhom/portal', () => {
    const ReactMock = require('react');
    const {View} = require('react-native');
    const PortalContext = ReactMock.createContext(null);
    return {
        PortalProvider: ({children}: {children: React.ReactNode}) => {
            portalProviderRendered = true;
            return <PortalContext.Provider value={{}}>{children}</PortalContext.Provider>;
        },
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
    return {AgentsIntro: () => <View testID='mock-agents-intro'/>};
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

    beforeEach(() => {
        portalProviderRendered = false;
    });

    it('should render PostDraft without error when channel is available', async () => {
        const {getByTestId} = renderWithEverything(
            <AgentChat
                componentId={Screens.AGENT_CHAT}
                bots={[mockBot]}
            />,
            {database},
        );

        // Wait for async channel creation (createDirectChannel in useEffect)
        // then PostDraft mounts inside the full provider tree.
        // This exercises the real PostDraft → DraftHandler → SendHandler chain.
        // If any required provider (e.g. PortalProvider, DatabaseProvider,
        // ExtraKeyboardProvider) is missing or breaks, this test fails.
        await waitFor(() => {
            expect(getByTestId('agent_chat.post_draft')).toBeTruthy();
        });

        // PortalProvider must wrap PostDraft so that Autocomplete's Portal
        // (used on Android when input is focused) has a context to render into.
        expect(portalProviderRendered).toBe(true);
    });

    it('should render intro screen when no bots are available', async () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <AgentChat
                componentId={Screens.AGENT_CHAT}
                bots={[]}
            />,
            {database},
        );

        // Wait for loading state to resolve (fetchAIBots is async)
        await waitFor(() => {
            expect(getByTestId('mock-agents-intro')).toBeTruthy();
        });
        expect(queryByTestId('agent_chat.post_draft')).toBeNull();
    });
});
