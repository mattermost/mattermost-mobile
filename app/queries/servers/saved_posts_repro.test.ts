// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// REPRO ONLY — do not commit. Verifies whether the saved-posts preference
// observable emits after handlePreferences writes a saved_post row, which is
// the suspected root cause of 11 e2e failures (saved messages list stays on
// empty state after saving).

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';

import {observeSavedPostsByIds, queryPostsById} from './post';
import {querySavedPostsPreferences} from './preference';

describe('saved posts preference observable repro', () => {
    const serverUrl = 'savedrepro.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should emit when a saved_post preference is created with value true', async () => {
        const emissions: number[] = [];
        const sub = querySavedPostsPreferences(database, undefined, 'true').
            observeWithColumns(['name']).
            subscribe((rows) => {
                emissions.push(rows.length);
            });

        await operator.handlePreferences({
            preferences: [{user_id: 'me', category: 'flagged_post', name: 'post1', value: 'true'}],
            prepareRecordsOnly: false,
        });
        await new Promise((r) => setTimeout(r, 50));

        sub.unsubscribe();
        expect(emissions[0]).toBe(0);
        expect(emissions[emissions.length - 1]).toBe(1);
    });

    it('should emit when an existing saved_post preference flips from false to true', async () => {
        await operator.handlePreferences({
            preferences: [{user_id: 'me', category: 'flagged_post', name: 'post2', value: 'false'}],
            prepareRecordsOnly: false,
        });

        const emissions: number[] = [];
        const sub = querySavedPostsPreferences(database, undefined, 'true').
            observeWithColumns(['name']).
            subscribe((rows) => {
                emissions.push(rows.length);
            });

        await operator.handlePreferences({
            preferences: [{user_id: 'me', category: 'flagged_post', name: 'post2', value: 'true'}],
            prepareRecordsOnly: false,
        });
        await new Promise((r) => setTimeout(r, 50));

        sub.unsubscribe();
        expect(emissions[emissions.length - 1]).toBe(1);
    });

    it('should emit when the preference row is destroyed (unsave)', async () => {
        await operator.handlePreferences({
            preferences: [{user_id: 'me', category: 'flagged_post', name: 'post3', value: 'true'}],
            prepareRecordsOnly: false,
        });

        const emissions: number[] = [];
        const sub = querySavedPostsPreferences(database, undefined, 'true').
            observeWithColumns(['name']).
            subscribe((rows) => {
                emissions.push(rows.length);
            });

        const records = await querySavedPostsPreferences(database, 'post3').fetch();
        await operator.batchRecords([records[0].prepareDestroyPermanently()], 'repro');
        await new Promise((r) => setTimeout(r, 50));

        sub.unsubscribe();
        expect(emissions[0]).toBe(1);
        expect(emissions[emissions.length - 1]).toBe(0);
    });

});

describe('saved messages screen pipe repro', () => {
    const serverUrl = 'savedpipe.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const sdo = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = sdo.database;
        operator = sdo.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const buildPipe = () => querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']).pipe(
        switchMap((rows) => {
            const ids = rows.map((r) => r.name);
            if (!ids.length) {
                return of$(new Set<string>());
            }
            return observeSavedPostsByIds(database, ids);
        }),
        switchMap((savedPostIds: Set<string>) => {
            const ids = [...savedPostIds];
            if (!ids.length) {
                return of$([]);
            }
            return queryPostsById(database, ids, Q.asc).observe();
        }),
    );

    it('should emit the saved post when pref+post exist before subscribe', async () => {
        const post = TestHelper.fakePost({channel_id: 'ch1', id: 'postpipe1'});
        await operator.handlePosts({actionType: ActionType.POSTS.RECEIVED_NEW, order: [post.id], posts: [post], prepareRecordsOnly: false});
        await operator.handlePreferences({preferences: [{user_id: 'me', category: 'flagged_post', name: post.id, value: 'true'}], prepareRecordsOnly: false});

        const emissions: any[][] = [];
        const sub = buildPipe().subscribe((posts: any) => emissions.push(posts));
        await new Promise((r) => setTimeout(r, 100));

        sub.unsubscribe();
        expect(emissions.length).toBeGreaterThan(0);
        expect(emissions[emissions.length - 1].length).toBe(1);
    });

    it('should emit the saved post when pref is added AFTER subscribe', async () => {
        const post = TestHelper.fakePost({channel_id: 'ch1', id: 'postpipe2'});
        await operator.handlePosts({actionType: ActionType.POSTS.RECEIVED_NEW, order: [post.id], posts: [post], prepareRecordsOnly: false});

        const emissions: any[][] = [];
        const sub = buildPipe().subscribe((posts: any) => emissions.push(posts));
        await new Promise((r) => setTimeout(r, 50));

        await operator.handlePreferences({preferences: [{user_id: 'me', category: 'flagged_post', name: post.id, value: 'true'}], prepareRecordsOnly: false});
        await new Promise((r) => setTimeout(r, 100));

        sub.unsubscribe();
        expect(emissions[emissions.length - 1].length).toBe(1);
    });
});
