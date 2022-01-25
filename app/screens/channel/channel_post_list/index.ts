// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {getTimezone} from '@utils/user';

import ChannelPostList from './channel_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {MY_CHANNEL, POST, POSTS_IN_CHANNEL, PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables(['channelId', 'forceQueryAfterAppState'], ({database, channelId}: {channelId: string; forceQueryAfterAppState: AppStateStatus} & WithDatabaseArgs) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    );

    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        currentUsername: currentUser.pipe((switchMap((user) => of$(user.username)))),
        isTimezoneEnabled: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
        lastViewedAt: database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId).pipe(
            switchMap((myChannel) => of$(myChannel.viewedAt)),
        ),
        posts: database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).observeWithColumns(['earliest', 'latest']).pipe(
            switchMap((postsInChannel) => {
                if (!postsInChannel.length) {
                    return of$([]);
                }

                const {earliest, latest} = postsInChannel[0];
                return database.get<PostModel>(POST).query(
                    Q.and(
                        Q.where('channel_id', channelId),
                        Q.where('create_at', Q.between(earliest, latest)),
                    ),
                    Q.sortBy('create_at', Q.desc),
                ).observe();
            }),
        ),
        shouldShowJoinLeaveMessages: database.get<PreferenceModel>(PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_ADVANCED_SETTINGS),
            Q.where('name', Preferences.ADVANCED_FILTER_JOIN_LEAVE),
        ).observe().pipe(
            switchMap((preferences) => of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true))),
        ),
    };
});

export default withDatabase(enhanced(ChannelPostList));
