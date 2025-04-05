// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftMessage from './draft_message';

import type {Database} from '@nozbe/watermelondb';
import type DraftModel from '@typings/database/models/servers/draft';

describe('Draft Message', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });
    it('should render the message', () => {
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
        const {getByText} = renderWithEverything(
            <DraftMessage {...props}/>, {database},
        );
        expect(getByText('Hello, World!')).toBeTruthy();
    });

    it('should match snapshot', () => {
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
            <DraftMessage {...props}/>, {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
