// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UnreadsCategory from './unreads';

import type {Database} from '@nozbe/watermelondb';

describe('components/channel_list/categories/body', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('do not render when there are no unread channels', () => {
        const wrapper = renderWithEverything(
            <UnreadsCategory
                unreadChannels={[]}
                onChannelSwitch={() => undefined}
                onlyUnreads={false}
                unreadThreads={{unreads: false, mentions: 0}}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeNull();
    });
});
