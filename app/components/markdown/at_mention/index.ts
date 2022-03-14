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

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {PREFERENCE, SYSTEM, USER}} = MM_TABLES;
const {CONFIG, CURRENT_USER_ID, LICENSE} = SYSTEM_IDENTIFIERS;

const enhance = withObservables(['mentionName'], ({database, mentionName}: {mentionName: string} & WithDatabaseArgs) => {
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG);
    const license = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE);
    const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );
    const teammateNameDisplay = combineLatest([config, license, preferences]).pipe(
        map(
            ([{value: cfg}, {value: lcs}, prefs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs),
        ),
    );

    let mn = mentionName.toLowerCase();
    if ((/[._-]$/).test(mn)) {
        mn = mn.substring(0, mn.length - 1);
    }

    return {
        currentUserId,
        teammateNameDisplay,
        users: database.get(USER).query(
            Q.where('username', Q.like(
                `%${Q.sanitizeLikeString(mn)}%`,
            )),
        ).observeWithColumns(['username']),
    };
});

export default withDatabase(enhance(AtMention));
