// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {CallsCustomMessage} from '@calls/components/calls_custom_message/calls_custom_message';
import {observeEndCallDetails, observeIsCallLimitRestricted} from '@calls/observers';
import {observeCallsState, observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {getNumUsersInCall} from '@calls/utils';
import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeChannel} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {isDMChannel} from '@utils/channel';
import {getUserIdFromChannelName} from '@utils/user';

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

    // Nothing on the post records who declined, but it can only have been the other side of the DM:
    // the post's author is the caller, and a DM has exactly two people in it.
    const callee = observeChannel(database, post.channelId).pipe(
        switchMap((channel) => (channel && isDMChannel(channel.type) ? observeUser(database, getUserIdFromChannelName(post.userId, channel.name)) : of$(undefined))),
    );

    // The call is not active, so return early with what we need to render the post.
    if (post.props?.end_at) {
        return {
            currentUser,
            isMilitaryTime,
            caller,
            callee,
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

    // A DM call post keeps the 'calling' status after the callee answers, so the number of people
    // in the call is what tells a ringing call apart from a connected one.
    const numUsers = observeCallsState(serverUrl).pipe(
        map((state) => getNumUsersInCall(state.calls[post.channelId])),
        distinctUntilChanged(),
    );

    // The post is updated with end_at only after the call_end event, so without this the card would
    // fall back to "Calling..." during teardown.
    const callExists = observeCallsState(serverUrl).pipe(
        map((state) => Boolean(state.calls[post.channelId])),
        distinctUntilChanged(),
    );

    return {
        currentUser,
        isMilitaryTime,
        caller,
        callee,
        teammateNameDisplay,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, post.channelId),
        ccChannelId,
        joiningChannelId,
        numUsers,
        callExists,
        ...observeEndCallDetails(),
    };
});

export default withDatabase(enhanced(CallsCustomMessage));
