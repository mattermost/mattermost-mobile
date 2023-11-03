// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import CallScreen from '@calls/screens/call_screen/call_screen';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {fillUserModels, idsAreEqual, sessionIds, userIds} from '@calls/utils';
import DatabaseManager from '@database/manager';
import {observeTeammateNameDisplay, queryUsersById} from '@queries/servers/user';

import type UserModel from '@typings/database/models/servers/user';

const enhanced = withObservables([], () => {
    const currentCall = observeCurrentCall();
    const database = currentCall.pipe(
        switchMap((call) => of$(call ? call.serverUrl : '')),
        distinctUntilChanged(),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );

    const sessionsDict = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? queryUsersById(db, userIds(Object.values(call.sessions))).observeWithColumns(['nickname', 'username', 'first_name', 'last_name', 'last_picture_update']) : of$([])).pipe(

            // We now have a UserModel[] one for each userId, but we need the session dictionary with user models
            // eslint-disable-next-line max-nested-callbacks
            switchMap((ps: UserModel[]) => of$(fillUserModels(call?.sessions || {}, ps))),
        )),
        distinctUntilChanged((prev, curr) => idsAreEqual(sessionIds(Object.values(prev)), sessionIds(Object.values(curr)))),
    );
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );

    return {
        currentCall,
        sessionsDict,
        micPermissionsGranted,
        teammateNameDisplay,
    };
});

export default enhanced(CallScreen);
