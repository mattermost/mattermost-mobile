// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import PlaybookRunsOption from '@playbooks/components/channel_actions/playbook_runs_option';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelQuickAction from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@playbooks/components/channel_actions/playbook_runs_option', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRunsOption).mockImplementation(
    (props) => React.createElement('PlaybookRunsOption', {testID: 'playbook-runs-option', ...props}),
);

describe('ChannelQuickAction', () => {
    function getBaseProps(): ComponentProps<typeof ChannelQuickAction> {
        return {
            channelId: 'channel-id',
            callsEnabled: false,
            isDMorGM: false,
            hasPlaybookRuns: false,
        };
    }

    let database: Database;

    beforeEach(async () => {
        const serverDatabase = await TestHelper.setupServerDatabase('server-url');
        database = serverDatabase.database;
    });

    it('does not show playbook runs option when hasPlaybookRuns is false', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = false;
        const {queryByTestId} = renderWithEverything(<ChannelQuickAction {...props}/>, {database});

        expect(queryByTestId('playbook-runs-option')).toBeNull();
    });

    it('shows playbook runs option when hasPlaybookRuns is true', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = true;
        const {getByTestId} = renderWithEverything(<ChannelQuickAction {...props}/>, {database});

        const playbookRunsOption = getByTestId('playbook-runs-option');
        expect(playbookRunsOption).toBeTruthy();
        expect(playbookRunsOption.props.channelId).toBe('channel-id');
    });
});
