// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {MM_TABLES} from '@app/constants/database';
import {TeamModel} from '@app/database/models/server';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelsList from './index';

describe('components/channel_list', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        await database.write(async () => {
            const team = (await database.get<TeamModel>(MM_TABLES.SERVER.TEAM).query().fetch()).pop();
            await team?.update(() => {
                team.displayName = 'Test Team!';
            });
        });
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <ChannelsList/>,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
