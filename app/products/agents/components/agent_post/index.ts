// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';

import AgentPost from './agent_post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type OwnProps = {
    post: PostModel;
    currentUserId?: string;
    location: AvailableScreens;
};

const enhanced = withObservables(['post'], ({post, database}: OwnProps & WithDatabaseArgs) => {
    const isDM = observeChannel(database, post.channelId).pipe(
        switchMap((channel) => of$(channel?.type === General.DM_CHANNEL)),
    );

    return {
        isDM,
    };
});

export default withDatabase(enhanced(AgentPost));
