// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelsList from './index';

describe('components/channel_list', () => {
    let database: Database | undefined;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <ChannelsList/>,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
