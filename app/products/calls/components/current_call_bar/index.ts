// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {fillUserModels, idsAreEqual, sessionIds, userIds} from '@calls/utils';
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
    const sessionsDict = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? queryUsersById(db, userIds(Object.values(call.sessions))).observeWithColumns(['nickname', 'username', 'first_name', 'last_name', 'last_picture_update']) : of$([])).pipe(

            // We now have a UserModel[] one for each userId, but we need the session dictionary with user models
            // eslint-disable-next-line max-nested-callbacks
            switchMap((ps: UserModel[]) => of$(fillUserModels(call?.sessions || {}, ps))),
        )),
        distinctUntilChanged((prev, curr) => idsAreEqual(sessionIds(Object.values(prev)), sessionIds(Object.values(curr)))),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );

    return {
        displayName,
        currentCall,
        sessionsDict,
        teammateNameDisplay,
        micPermissionsGranted,
    };
});

export default enhanced(CurrentCallBar);
