// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay, observeUsersById} from '@queries/servers/user';

import CurrentCallBar from './current_call_bar';

import type UserModel from '@typings/database/models/servers/user';

const enhanced = withObservables([], () => {
    const currentCall = observeCurrentCall();
    const database = currentCall.pipe(
        switchMap((call) => of$(call ? call.serverUrl : '')),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const displayName = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? observeChannel(db, call.channelId) : of$(undefined))),
        switchMap((c) => of$(c ? c.displayName : '')),
    );
    const userModelsDict = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? observeUsersById(db, Object.keys(call.participants)) : of$([]))),
        switchMap((ps) => of$(
            ps.reduce((accum, cur) => { // eslint-disable-line max-nested-callbacks
                accum[cur.id] = cur;
                return accum;
            }, {} as Dictionary<UserModel>)),
        ),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
    );

    return {
        displayName,
        currentCall,
        userModelsDict,
        teammateNameDisplay,
    };
});

export default enhanced(CurrentCallBar);
