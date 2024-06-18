// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {CallsCustomMessage} from '@calls/components/calls_custom_message/calls_custom_message';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type OwnProps = {
    serverUrl: string;
    post: PostModel;
}

const enhanced = withObservables(['post'], ({serverUrl, post, database}: OwnProps & WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const isMilitaryTime = queryDisplayNamePreferences(database).observeWithColumns(['value']).pipe(
        switchMap(
            (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME)),
        ),
    );

    // The call is not active, so return early with what we need to render the post.
    if (post.props.end_at) {
        return {
            currentUser,
            isMilitaryTime,
        };
    }

    const ccChannelId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.channelId)),
        distinctUntilChanged(),
    );
    const joiningChannelId = observeGlobalCallsState().pipe(
        switchMap((state) => of$(state?.joiningChannelId)),
        distinctUntilChanged(),
    );

    return {
        currentUser,
        isMilitaryTime,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, post.channelId),
        ccChannelId,
        joiningChannelId,
    };
});

export default withDatabase(enhanced(CallsCustomMessage));
