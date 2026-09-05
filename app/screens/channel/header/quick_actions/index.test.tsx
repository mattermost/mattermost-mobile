// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import PlaybookRunsOption from '@playbooks/components/channel_actions/playbook_runs_option';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
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

    let database: Database;
    let operator: ServerDataOperator;

    const setAnalysisLicense = () => {
        return operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {SkuShortName: 'enterprise'}}],
            prepareRecordsOnly: false,
        });
    };

    beforeEach(async () => {
        const serverDatabase = await TestHelper.setupServerDatabase('server-url');
        database = serverDatabase.database;
        operator = serverDatabase.operator;
    });

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

    it('should show Ask Agents option in all channel types when analysis is licensed', async () => {
        await setAnalysisLicense();
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});

        await waitFor(() => {
            expect(getByTestId('channel.quick_actions.ask_agents')).toBeTruthy();
        });
    });

    it('should show Ask Agents option in DM/GM channels when analysis is licensed', async () => {
        await setAnalysisLicense();
        const props = getBaseProps();
        props.isDMorGM = true;
        const {getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});

        await waitFor(() => {
            expect(getByTestId('channel.quick_actions.ask_agents')).toBeTruthy();
        });
    });

    it('should not show Ask Agents option when the server is not licensed for analysis', async () => {
        const props = getBaseProps();
        const {queryByTestId, getByTestId} = renderWithEverything(<ChannelQuickActions {...props}/>, {database});

        await waitFor(() => {
            expect(getByTestId('channel.quick_actions.channel_info.action')).toBeTruthy();
        });
        expect(queryByTestId('channel.quick_actions.ask_agents')).toBeNull();
    });
});
