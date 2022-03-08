// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables(
    ['thread'],
    ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
        const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
        const license = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(switchMap(({value}) => of$(value as ClientLicense)));
        const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
        const teammateNameDisplay = combineLatest([preferences, config, license]).pipe(
            map(([prefs, cfg, lcs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs)),
        );
        return {
            participants: thread.participants.observe().pipe(
                switchMap((participants) => {
                    // eslint-disable-next-line max-nested-callbacks
                    const participantIds = participants.map((participant) => participant.userId);
                    return database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(participantIds))).observe();
                }),
            ),
            teammateNameDisplay,
        };
    },
);

export default withDatabase(enhanced(Footer));
