// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftPost from '.';

import type {Database} from '@nozbe/watermelondb';
import type DraftModel from '@typings/database/models/servers/draft';

describe('Draft Post', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });
    it('should match the snapshot', () => {
        const props = {
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
            } as unknown as DraftModel,
            layoutWidth: 100,
            location: 'draft',
        };
        const wrapper = renderWithEverything(
            <DraftPost {...props}/>, {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
