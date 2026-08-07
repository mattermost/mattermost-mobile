// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {rewriteStore} from '@agents/store';
import PlaybookRunsOption from '@playbooks/components/channel_actions/playbook_runs_option';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelQuickActions from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@agents/store/agents_config', () => ({
    useAgentsConfig: jest.fn(() => ({pluginEnabled: true})),
}));

jest.mock('@playbooks/components/channel_actions/playbook_runs_option', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRunsOption).mockImplementation(
    (props: ComponentProps<typeof PlaybookRunsOption>) => React.createElement('PlaybookRunsOption', {testID: 'playbook-runs-option', ...props}),
);

describe('ChannelQuickAction', () => {
    function getBaseProps(): ComponentProps<typeof ChannelQuickActions> {
        return {
            channelId: 'channel-id',
            callsEnabled: false,
            isDMorGM: false,
            hasPlaybookRuns: false,
        };
    }

    const serverUrl = 'server-url';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        const serverDatabase = await TestHelper.setupServerDatabase(serverUrl);
        database = serverDatabase.database;
        operator = serverDatabase.operator;
    });

    afterEach(() => {
        rewriteStore.setAgents(serverUrl, []);
    });

    // The Ask Agents entry point is gated on the analysis license (dev mode
    // counts) and on at least one agent being available.
    async function enableAskAgents() {
        await operator.handleConfigs({
            configs: [
                {id: 'EnableTesting', value: 'true'},
                {id: 'EnableDeveloper', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        rewriteStore.setAgents(serverUrl, [{id: 'bot1', displayName: 'Matty', username: 'matty'}]);
    }

    it('does not show playbook runs option when hasPlaybookRuns is false', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = false;
        const {queryByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});

        expect(queryByTestId('playbook-runs-option')).toBeNull();
    });

    it('shows playbook runs option when hasPlaybookRuns is true', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = true;
        const {getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});

        const playbookRunsOption = getByTestId('playbook-runs-option');
        expect(playbookRunsOption).toBeTruthy();
        expect(playbookRunsOption.props.channelId).toBe('channel-id');
        expect(playbookRunsOption.props.location).toBe('quick_actions');
    });

    it('does not show playbook runs option when is DM or GM', () => {
        const props = getBaseProps();
        props.isDMorGM = true;
        props.hasPlaybookRuns = true;
        const {queryByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});
        expect(queryByTestId('playbook-runs-option')).toBeNull();
    });

    it('shows Ask Agents option in all channel types', async () => {
        await enableAskAgents();
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database, serverUrl});

        expect(getByTestId('channel.quick_actions.ask_agents')).toBeTruthy();
    });

    it('shows Ask Agents option in DM/GM channels', async () => {
        await enableAskAgents();
        const props = getBaseProps();
        props.isDMorGM = true;
        const {getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database, serverUrl});

        expect(getByTestId('channel.quick_actions.ask_agents')).toBeTruthy();
    });

    it('does not show Ask Agents option when analysis is not licensed', async () => {
        rewriteStore.setAgents(serverUrl, [{id: 'bot1', displayName: 'Matty', username: 'matty'}]);
        const props = getBaseProps();
        const {queryByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database, serverUrl});

        expect(queryByTestId('channel.quick_actions.ask_agents')).toBeNull();
    });
});
