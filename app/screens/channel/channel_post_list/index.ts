// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observePreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import ChannelPostList from './channel_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

const {SERVER: {MY_CHANNEL, POST, POSTS_IN_CHANNEL}} = MM_TABLES;

const enhanced = withObservables(['channelId', 'forceQueryAfterAppState'], ({database, channelId}: {channelId: string; forceQueryAfterAppState: AppStateStatus} & WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        currentUsername: currentUser.pipe((switchMap((user) => of$(user.username)))),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
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
        shouldShowJoinLeaveMessages: observePreferencesByCategoryAndName(database, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE).pipe(
            switchMap((preferences) => of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true))),
        ),
    };
});

export default withDatabase(enhanced(ChannelPostList));
