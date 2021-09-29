// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

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
    config: ClientConfig;
    differentThreadSequence: boolean;
    license: ClientLicense;
    preferences: PreferenceModel[];
    post: PostModel;
};

const withBaseHeaderProps = withObservables([], ({database}: WithDatabaseArgs & {post: PostModel}) => ({
    config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
    license: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(switchMap((lcs: SystemModel) => of$(lcs.value))),
    preferences: database.get(MM_TABLES.SERVER.PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe(),
}));

const withHeaderProps = withObservables(
    ['preferences', 'post', 'differentThreadSequence'],
    ({config, post, license, database, preferences, differentThreadSequence}: WithDatabaseArgs & HeaderInputProps) => {
        const author = post.author.observe();
        const enablePostUsernameOverride = of$(config.EnablePostUsernameOverride === 'true');
        const isTimezoneEnabled = of$(config.ExperimentalTimezone === 'true');
        const isMilitaryTime = of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false));
        const teammateNameDisplay = of$(getTeammateNameDisplaySetting(preferences, config, license));
        const isCustomStatusEnabled = of$(config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36));
        const commentCount = database.get(MM_TABLES.SERVER.POST).query(
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

export default withDatabase(withBaseHeaderProps(withHeaderProps(Header)));
