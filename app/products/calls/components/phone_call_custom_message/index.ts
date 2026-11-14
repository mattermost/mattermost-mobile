// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {PhoneCallCustomMessage} from '@calls/components/phone_call_custom_message/phone_call_custom_message';
import {observeCurrentCall, observeIsPhoneDialingAvailable} from '@calls/state';
import {getPhoneCallPropsFromPost} from '@calls/utils';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type OwnProps = {
    serverUrl: string;
    post: PostModel;
}

// No branch on end_at: withObservables doesn't rebuild when a live post gets it.
const enhanced = withObservables(['post'], ({serverUrl, post, database}: OwnProps & WithDatabaseArgs) => {
    const targetUserId = getPhoneCallPropsFromPost(post)?.targetUserId;
    const currentCall = observeCurrentCall();

    return {
        currentUser: observeCurrentUser(database),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        targetUser: targetUserId ? observeUser(database, targetUserId) : of$(undefined),
        canDial: observeIsPhoneDialingAvailable(serverUrl),
        inCall: currentCall.pipe(
            map((call) => call?.threadId === post.id),
            distinctUntilChanged(),
        ),
        answered: currentCall.pipe(
            map((call) => call?.threadId === post.id && Boolean(call.dmCalleeAnsweredAt)),
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(PhoneCallCustomMessage));
