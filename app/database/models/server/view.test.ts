// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import ViewModel from './view';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {VIEW} = MM_TABLES.SERVER;

const SERVER_URL = `viewModel.test.${Date.now()}.com`;

const applyMockData = (view: ViewModel, mockData: View) => {
    view._raw.id = mockData.id;
    view.channelId = mockData.channel_id;
    view.type = mockData.type;
    view.creatorId = mockData.creator_id;
    view.title = mockData.title;
    view.description = mockData.description ?? null;
    view.sortOrder = mockData.sort_order;
    view.props = mockData.props;
    view.createAt = mockData.create_at;
    view.updateAt = mockData.update_at;
    view.deleteAt = mockData.delete_at;
};

describe('ViewModel', () => {
    let operator: ServerDataOperator;
    let view: ViewModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        await database.write(async () => {
            view = await database.get<ViewModel>(VIEW).create((v: ViewModel) => {
                applyMockData(v, TestHelper.createView('channel_1', 0));
            });
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should have the correct table name', () => {
        expect(ViewModel.table).toBe(VIEW);
    });

    it('=> should match stored data', () => {
        expect(view).toBeDefined();
        expect(view.id).toBe('channel_1-view_0');
        expect(view.channelId).toBe('channel_1');
        expect(view.type).toBe('kanban');
        expect(view.creatorId).toBe('creator_id');
        expect(view.title).toBe('View 1');
        expect(view.description).toBe('Description 1');
        expect(view.sortOrder).toBe(0);
        expect(view.props).toEqual({});
        expect(view.deleteAt).toBe(0);
    });

    it('=> should round-trip props through @json safeParseJSON', async () => {
        const {database} = operator;
        let stored: ViewModel;

        await database.write(async () => {
            stored = await database.get<ViewModel>(VIEW).create((v: ViewModel) => {
                applyMockData(v, TestHelper.createView('channel_1', 1));
                v.props = {filters: ['status:open'], color: 'blue'};
            });
        });

        expect(stored!.props).toEqual({filters: ['status:open'], color: 'blue'});
    });

    it('=> should support soft-delete via deleteAt', async () => {
        const {database} = operator;

        await database.write(async () => {
            await view.update((v: ViewModel) => {
                v.deleteAt = 1620000010000;
            });
        });

        expect(view.deleteAt).toBe(1620000010000);
    });
});
