// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {isMinimumServerVersion} from '@utils/helpers';

import Header from './header';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

type HeaderInputProps = {
    differentThreadSequence: boolean;
    post: PostModel;
};

const {SERVER: {POST, PREFERENCE, SYSTEM}} = MM_TABLES;

const withHeaderProps = withObservables(
    ['post', 'differentThreadSequence'],
    ({post, database, differentThreadSequence}: WithDatabaseArgs & HeaderInputProps) => {
        const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap(({value}) => of$(value as ClientConfig)));
        const license = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(switchMap(({value}) => of$(value as ClientLicense)));
        const preferences = database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe();
        const author = post.author.observe();
        const enablePostUsernameOverride = config.pipe(map((cfg) => cfg.EnablePostUsernameOverride === 'true'));
        const isTimezoneEnabled = config.pipe(map((cfg) => cfg.ExperimentalTimezone === 'true'));
        const isMilitaryTime = preferences.pipe(map((prefs) => getPreferenceAsBool(prefs, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)));
        const isCustomStatusEnabled = config.pipe(map((cfg) => cfg.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(cfg.Version, 5, 36)));
        const teammateNameDisplay = combineLatest([preferences, config, license]).pipe(
            map(([prefs, cfg, lcs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs)),
        );
        const commentCount = database.get(POST).query(
            Q.and(
                Q.where('root_id', (post.rootId || post.id)),
                Q.where('delete_at', Q.eq(0)),
            ),
        ).observeCount();
        const rootPostAuthor = differentThreadSequence ? post.root.observe().pipe(switchMap((root) => {
            if (root.length) {
                return root[0].author.observe();
            }

            return of$(null);
        })) : of$(null);

        return {
            author,
            commentCount,
            enablePostUsernameOverride,
            isCustomStatusEnabled,
            isMilitaryTime,
            isTimezoneEnabled,
            teammateNameDisplay,
            rootPostAuthor,
        };
    });

export default withDatabase(withHeaderProps(Header));
