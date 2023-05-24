// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap, of as of$} from 'rxjs';

import {observeChannel} from '@queries/servers/channel';
import {observeTeam} from '@queries/servers/team';

import ChannelInfo from './channel_info';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({post, database}: {post: PostModel} & WithDatabaseArgs) => {
    const channel = observeChannel(database, post.channelId);

    return {
        channelId: channel.pipe(
            switchMap((chan) => (chan ? of$(chan.id) : '')),
        ),
        channelName: channel.pipe(
            switchMap((chan) => (chan ? of$(chan.displayName) : '')),
        ),
        teamName: channel.pipe(
            switchMap((chan) => (chan && chan.teamId ? observeTeam(database, chan.teamId) : of$(null))),
            switchMap((team) => of$(team?.displayName || null)),
        ),
    };
});

export default withDatabase(enhance(ChannelInfo));
