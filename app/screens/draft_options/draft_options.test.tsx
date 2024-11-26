// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DraftOptions from '.';

import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
describe('Draft Options', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });
    it('should render the draft options component', () => {
        const props = {
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as unknown as ChannelModel,
            rootId: '',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
            } as unknown as DraftModel,
            draftReceiverUserName: undefined,
        };
        const wrapper = renderWithEverything(
            <DraftOptions {...props}/>, {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render the draft options', () => {
        const props = {
            channel: {
                id: 'channel_id',
                teamId: 'team_id',
            } as unknown as ChannelModel,
            rootId: '',
            draft: {
                updateAt: 1633024800000,
                message: 'Hello, World!',
                channelId: 'channel_id',
                rootId: '',
                files: [],
                metadata: {},
            } as unknown as DraftModel,
            draftReceiverUserName: 'username',
        };
        const wrapper = renderWithEverything(
            <DraftOptions {...props}/>, {database},
        );
        const {getByText} = wrapper;
        expect(getByText('Draft actions')).toBeTruthy();
        expect(getByText('Edit draft')).toBeTruthy();
        expect(getByText('Send draft')).toBeTruthy();
        expect(getByText('Delete draft')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
