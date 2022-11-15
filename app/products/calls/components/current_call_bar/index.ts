// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {idsAreEqual} from '@calls/utils';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay, queryUsersById} from '@queries/servers/user';

import CurrentCallBar from './current_call_bar';

import type UserModel from '@typings/database/models/servers/user';

const enhanced = withObservables([], () => {
    const currentCall = observeCurrentCall();
    const ccServerUrl = currentCall.pipe(
        switchMap((call) => of$(call?.serverUrl || '')),
        distinctUntilChanged(),
    );
    const ccChannelId = currentCall.pipe(
        switchMap((call) => of$(call?.channelId || '')),
        distinctUntilChanged(),
    );
    const database = ccServerUrl.pipe(
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const displayName = combineLatest([database, ccChannelId]).pipe(
        switchMap(([db, id]) => (db && id ? observeChannel(db, id) : of$(undefined))),
        switchMap((c) => of$(c?.displayName || '')),
        distinctUntilChanged(),
    );
    const participantIds = currentCall.pipe(
        distinctUntilChanged((prev, curr) => prev?.participants === curr?.participants), // Did the participants object ref change?
        switchMap((call) => (call ? of$(Object.keys(call.participants)) : of$([]))),
        distinctUntilChanged((prev, curr) => idsAreEqual(prev, curr)),
    );
    const userModelsDict = combineLatest([database, participantIds]).pipe(
        switchMap(([db, ids]) => (db && ids.length > 0 ? queryUsersById(db, ids).observeWithColumns(['nickname', 'username', 'first_name', 'last_name']) : of$([]))),
        switchMap((ps) => of$(arrayToDic(ps))),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
    );
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );

    return {
        displayName,
        currentCall,
        userModelsDict,
        teammateNameDisplay,
        micPermissionsGranted,
    };
});

function arrayToDic(participants: UserModel[]) {
    return participants.reduce((accum, cur) => {
        accum[cur.id] = cur;
        return accum;
    }, {} as Dictionary<UserModel>);
}

export default enhanced(CurrentCallBar);
