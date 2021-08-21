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
import type SystemModel from '@typings/database/models/servers/system';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

type HeaderInputProps = {
    config: ClientConfig;
    license: ClientLicense;
    preferences: PreferenceModel[];
    postsInThread?: PostsInThreadModel;
    post: PostModel;
};

const withBaseHeaderProps = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => ({
    config: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
    license: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(switchMap((lcs: SystemModel) => of$(lcs.value))),
    preferences: database.get(MM_TABLES.SERVER.PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe(),
    postInThread: post.postsInThread.observe().pipe(
        switchMap((postsInThreads) => {
            if (postsInThreads.length) {
                return postsInThreads[0].observe();
            }
            return of$(null);
        })),
}));

const withHeaderProps = withObservables(
    ['postsInThread', 'preferences', 'post'],
    ({config, post, postsInThread, license, database, preferences}: WithDatabaseArgs & HeaderInputProps) => {
        const author = post.author.observe();
        const enablePostUsernameOverride = of$(config.EnablePostUsernameOverride === 'true');
        const isTimezoneEnabled = of$(config.ExperimentalTimezone === 'true');
        const isMilitaryTime = of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false));
        const teammateNameDisplay = of$(getTeammateNameDisplaySetting(preferences, config, license));
        const isCustomStatusEnabled = of$(config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36));
        const earliest = postsInThread?.earliest || 0;
        const latest = postsInThread?.latest || 0;
        const commentCount = earliest < latest ? database.get(MM_TABLES.SERVER.POST).query(
            Q.and(
                Q.where('root_id', (post.rootId || post.id)),
                Q.where('create_at', Q.between(earliest, latest)),
                Q.where('delete_at', Q.eq(0)),
            ),
        ).observeCount() : of$(0);
        const rootPostAuthor = post.root.observe().pipe(switchMap((root) => {
            if (root.length) {
                return root[0].author.observe();
            }

            return of$(null);
        }));

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
