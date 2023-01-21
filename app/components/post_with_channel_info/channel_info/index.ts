// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {switchMap, of as of$} from 'rxjs';

import {observeTeam} from '@queries/servers/team';

import ChannelInfo from './channel_info';

import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({post}: {post: PostModel}) => {
    const channel = post.channel.observe();

    return {
        channelId: channel.pipe(
            switchMap((chan) => (chan ? of$(chan.id) : '')),
        ),
        channelName: channel.pipe(
            switchMap((chan) => (chan ? of$(chan.displayName) : '')),
        ),
        teamName: channel.pipe(
            switchMap((chan) => (chan && chan.teamId ? observeTeam(post.database, chan.teamId) : of$(null))),
            switchMap((team) => of$(team?.displayName || null)),
        ),
    };
});

export default enhance(ChannelInfo);
