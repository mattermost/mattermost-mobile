// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

import {DMS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {observeCanReadDmGm} from '@queries/servers/dm_gm_access';

import {observeFlattenedCategories, type FlattenedCategoriesData} from './observe_flattened_categories';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@queries/servers/dm_gm_access', () => ({
    observeCanReadDmGm: jest.fn(),
}));

const serverUrl = 'flattened-categories.test.com';
const teamId = 'teamid1';

const headerIds = (data: FlattenedCategoriesData) => data.items.filter((item) => item.type === 'header').map((item) => item.categoryId);

describe('observeFlattenedCategories', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleCategories({
            categories: [
                {id: 'channelscategoryid', team_id: teamId, type: 'channels', display_name: 'Channels', sorting: 'alpha', sort_order: 0, muted: false, collapsed: false},
                {id: 'dmscategoryid', team_id: teamId, type: DMS_CATEGORY, display_name: 'Direct Messages', sorting: 'recent', sort_order: 1, muted: false, collapsed: false},
            ],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should drop the direct messages category while direct and group messages are hidden', async () => {
        const canRead = new BehaviorSubject(false);
        jest.mocked(observeCanReadDmGm).mockReturnValue(canRead);

        const next = jest.fn();
        const subscription = observeFlattenedCategories(operator.database, 'userid1', 'en', false, false, teamId).subscribe({next});
        await new Promise(process.nextTick);
        expect(headerIds(next.mock.calls[next.mock.calls.length - 1][0])).toEqual(['channelscategoryid']);

        canRead.next(true);
        await new Promise(process.nextTick);
        expect(headerIds(next.mock.calls[next.mock.calls.length - 1][0])).toEqual(['channelscategoryid', 'dmscategoryid']);
        subscription.unsubscribe();
    });
});
