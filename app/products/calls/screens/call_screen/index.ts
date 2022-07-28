// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import CallScreen from '@calls/screens/call_screen/call_screen';
import {observeCurrentCall} from '@calls/state';
import {CallParticipant} from '@calls/types/calls';
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
    const participantsDict = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? queryUsersById(db, Object.keys(call.participants)).observeWithColumns(['nickname', 'username', 'firstname', 'lastname', 'first_name', 'last_name', 'lastPictureUpdate', 'last_picture_update']) : of$([])).pipe(
            // eslint-disable-next-line max-nested-callbacks
            switchMap((ps: UserModel[]) => of$(ps.reduce((accum, cur) => {
                accum[cur.id] = {
                    ...call!.participants[cur.id],
                    userModel: cur,
                };
                return accum;
            }, {} as Dictionary<CallParticipant>))),
        )),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
    );

    return {
        currentCall,
        participantsDict,
        teammateNameDisplay,
    };
});

export default enhanced(CallScreen);
