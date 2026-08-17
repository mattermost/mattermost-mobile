// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, scan, switchMap} from 'rxjs/operators';

import {CallsCustomMessage} from '@calls/components/calls_custom_message/calls_custom_message';
import {observeEndCallDetails, observeIsCallLimitRestricted} from '@calls/observers';
import {observeCallsState, observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

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

    // The caller is the author of the call post, needed to name who canceled the call.
    const caller = observeUser(database, post.userId);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    // The call is not active, so return early with what we need to render the post.
    if (post.props?.end_at) {
        return {
            currentUser,
            isMilitaryTime,
            caller,
            teammateNameDisplay,
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

    // A DM call post keeps the 'calling' status after the callee answers, so the number of
    // connected sessions is what tells a ringing call apart from a connected one.
    const numSessions = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(Object.keys(state.calls[post.channelId]?.sessions || {}).length)),
        distinctUntilChanged(),
    );

    // The post is updated with end_at after the call_end event, so the card would fall back to
    // "Calling..." during teardown.
    const callTornDown = observeCallsState(serverUrl).pipe(
        map((state) => Boolean(state.calls[post.channelId])),
        distinctUntilChanged(),
        scan(
            (acc, callExists) => ({seen: acc.seen || callExists, tornDown: acc.seen && !callExists}),
            {seen: false, tornDown: false},
        ),
        map(({tornDown}) => tornDown),
        distinctUntilChanged(),
    );

    return {
        currentUser,
        isMilitaryTime,
        caller,
        teammateNameDisplay,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, post.channelId),
        ccChannelId,
        joiningChannelId,
        numSessions,
        callTornDown,
        ...observeEndCallDetails(),
    };
});

export default withDatabase(enhanced(CallsCustomMessage));
