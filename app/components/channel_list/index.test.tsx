// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {getTeamById} from '@queries/servers/team';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelsList from './index';

describe('components/channel_list', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        const team = await getTeamById(database, TestHelper.basicTeam!.id);
        await database.write(async () => {
            await team?.update(() => {
                team.displayName = 'Test Team!';
            });
        });
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <SafeAreaProvider>
                <ChannelsList
                    isTablet={false}
                    teamsCount={1}
                />
            </SafeAreaProvider>,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
