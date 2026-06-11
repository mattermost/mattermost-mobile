// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Regression guard for the home-tab freezeOnBlur setting
// (app/routes/(authenticated)/(home)/_layout.tsx): react-freeze suspension
// permanently drops withObservables subscription updates, so freezeOnBlur
// must stay false on tabs whose screens observe the database. If react-freeze
// or WatermelonDB ever fix this (the first test starts failing), freezeOnBlur
// can be reconsidered.

import {withObservables} from '@nozbe/watermelondb/react';
import {act, render} from '@testing-library/react-native';
import React from 'react';
import {Freeze} from 'react-freeze';
import {Text} from 'react-native';

import DatabaseManager from '@database/manager';
import {querySavedPostsPreferences} from '@queries/servers/preference';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PreferenceModel from '@typings/database/models/servers/preference';

const Inner = ({prefs}: {prefs: PreferenceModel[]}) => (
    <Text testID='count'>{`count:${prefs.length}`}</Text>
);

describe('withObservables under react-freeze', () => {
    const serverUrl = 'freezerepro.test.com';
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

    // Documents the react-freeze limitation that forces freezeOnBlur: false on
    // the home tabs (app/routes/(authenticated)/(home)/_layout.tsx): setState
    // updates from withObservables subscriptions are PERMANENTLY dropped while
    // frozen — the UI stays stale even after unfreezing.
    it('drops DB changes made while frozen (react-freeze limitation)', async () => {
        const Enhanced = withObservables([], () => ({
            prefs: querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']),
        }))(Inner);

        const ui = (freeze: boolean) => (
            <Freeze freeze={freeze}>
                <Enhanced/>
            </Freeze>
        );

        const screen = render(ui(false));
        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });
        expect(screen.getByTestId('count').props.children).toBe('count:0');

        // # Freeze (tab blurred), then write while frozen
        screen.rerender(ui(true));
        await act(async () => {
            await operator.handlePreferences({
                preferences: [{user_id: 'me', category: 'flagged_post', name: 'p1', value: 'true'}],
                prepareRecordsOnly: false,
            });
            await new Promise((r) => setTimeout(r, 50));
        });

        // # Unfreeze (tab refocused)
        screen.rerender(ui(false));
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        // * The row written while frozen never reaches the UI — this is the
        // bug freezeOnBlur: false avoids. If react-freeze/WatermelonDB ever
        // fix this (count:1 here), freezeOnBlur can be re-enabled.
        expect(screen.getByTestId('count').props.children).toBe('count:0');

        // * Worse: the subscription never recovers — a NEW change arriving
        // after unfreeze is also lost. One freeze cycle permanently kills
        // live updates for the screen (DB now has 2 rows; UI still shows 0).
        await act(async () => {
            await operator.handlePreferences({
                preferences: [{user_id: 'me', category: 'flagged_post', name: 'p1b', value: 'true'}],
                prepareRecordsOnly: false,
            });
            await new Promise((r) => setTimeout(r, 100));
        });
        expect(screen.getByTestId('count').props.children).toBe('count:0');
    });

    it('control: shows DB changes when never frozen', async () => {
        const Enhanced = withObservables([], () => ({
            prefs: querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']),
        }))(Inner);

        const screen = render(<Enhanced/>);
        await act(async () => {
            await operator.handlePreferences({
                preferences: [{user_id: 'me', category: 'flagged_post', name: 'p2', value: 'true'}],
                prepareRecordsOnly: false,
            });
            await new Promise((r) => setTimeout(r, 100));
        });
        expect(screen.getByTestId('count').props.children).toBe('count:1');
    });
});
