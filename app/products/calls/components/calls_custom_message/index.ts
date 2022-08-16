// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {CallsCustomMessage} from '@calls/components/calls_custom_message/calls_custom_message';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {observeCurrentCall} from '@calls/state';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type OwnProps = {
    serverUrl: string;
    post: PostModel;
}

const enhanced = withObservables(['post'], ({serverUrl, post, database}: OwnProps & WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const author = observeUser(database, post.userId);
    const isMilitaryTime = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).observeWithColumns(['value']).pipe(
        switchMap(
            (preferences) => of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)),
        ),
    );

    // The call is not active, so return early with what we need to render the post.
    if (post.props.end_at) {
        return {
            currentUser,
            author,
            isMilitaryTime,
        };
    }

    const ccDatabase = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.serverUrl || '')),
        distinctUntilChanged(),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const currentCallChannelId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.channelId || '')),
        distinctUntilChanged(),
    );
    const leaveChannelName = combineLatest([ccDatabase, currentCallChannelId]).pipe(
        switchMap(([db, id]) => (db && id ? observeChannel(db, id) : of$(undefined))),
        switchMap((c) => of$(c ? c.displayName : '')),
        distinctUntilChanged(),
    );
    const joinChannelName = observeChannel(database, post.channelId).pipe(
        switchMap((chan) => of$(chan?.displayName || '')),
        distinctUntilChanged(),
    );

    return {
        currentUser,
        author,
        isMilitaryTime,
        teammateNameDisplay: observeTeammateNameDisplay(database),
        currentCallChannelId,
        leaveChannelName,
        joinChannelName,
        limitRestrictedInfo: observeIsCallLimitRestricted(serverUrl, post.channelId),
    };
});

export default withDatabase(enhanced(CallsCustomMessage));
