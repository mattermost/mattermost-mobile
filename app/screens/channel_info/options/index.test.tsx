// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import PlaybookRunsOption from '@playbooks/components/channel_actions/playbook_runs_option';
import {renderWithEverything} from '@test/intl-test-helper';

import ChannelInfoOptions from './';

import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'some.server.url';

jest.mock('@playbooks/components/channel_actions/playbook_runs_option');
jest.mocked(PlaybookRunsOption).mockImplementation((props) => {
    return React.createElement('PlaybookRunsOption', {...props, testID: 'playbook-runs-option'});
});

describe('ChannelInfoOptions', () => {
    let database: Database;

    function getBaseProps(): ComponentProps<typeof ChannelInfoOptions> {
        return {
            channelId: 'channel-id',
            callsEnabled: false,
            canManageMembers: false,
            isCRTEnabled: false,
            canManageSettings: false,
            isPlaybooksEnabled: true,
        };
    }
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
    });
    it('should pass the channel id correctly to the PlaybookRunsOption', () => {
        const props = getBaseProps();
        const {getByTestId, rerender} = renderWithEverything(<ChannelInfoOptions {...props}/>, {database});
        expect(getByTestId('playbook-runs-option')).toHaveProp('channelId', 'channel-id');
        expect(getByTestId('playbook-runs-option')).toHaveProp('location', 'channel_actions');

        props.channelId = 'channel-id-2';
        rerender(<ChannelInfoOptions {...props}/>);
        expect(getByTestId('playbook-runs-option')).toHaveProp('channelId', 'channel-id-2');
    });
    it('should not show playbook runs option when is DM or GM', () => {
        const props = getBaseProps();
        props.type = General.DM_CHANNEL;
        const {queryByTestId, rerender} = renderWithEverything(<ChannelInfoOptions {...props}/>, {database});
        expect(queryByTestId('playbook-runs-option')).toBeNull();

        props.type = General.GM_CHANNEL;
        rerender(<ChannelInfoOptions {...props}/>);
        expect(queryByTestId('playbook-runs-option')).toBeNull();
    });
});
