// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {switchMap, of} from 'rxjs';

import {observeChannel, observeChannelMembers} from '@queries/servers/channel';
import {observeIsPostPriorityEnabled} from '@queries/servers/post';
import {observeCurrentUser, observeUser} from '@queries/servers/user';

import DraftAndScheduledPost from './draft_scheduled_post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    currentUser?: UserModel;
    members?: ChannelMembershipModel[];
    channel?: ChannelModel;
    post: DraftModel | ScheduledPostModel;
} & WithDatabaseArgs;

const withCurrentUser = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

const withChannel = withObservables(['channelId'], ({channelId, database}: Props) => ({
    channel: observeChannel(database, channelId),
}));

const withChannelMembers = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);

    const members = channel.pipe(
        switchMap((channelData) => {
            if (channelData?.type === 'D') {
                return observeChannelMembers(database, channelId);
            }
            return of(undefined);
        }),
    );

    return {
        members,
    };
});

const observePostReceiverUser = ({
    members,
    database,
    channelData,
    currentUser,
}: {
    members?: ChannelMembershipModel[];
    database: WithDatabaseArgs['database'];
    channelData?: ChannelModel;
    currentUser?: UserModel;
}) => {
    if (channelData?.type === 'D') {
        if (members && members.length > 0) {
            const validMember = members.find((member) => member.userId !== currentUser?.id);
            if (validMember) {
                return observeUser(database, validMember.userId);
            }
            return of(undefined);
        }
        return of(undefined);
    }
    return of(undefined);
};

const enhance = withObservables(['channel', 'members', 'post'], ({channel, database, currentUser, members, post}: Props) => {
    const postReceiverUser = observePostReceiverUser({members, database, channelData: channel, currentUser});
    return {
        post: post.observe(),
        channel,
        postReceiverUser,
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
    };
});

export default React.memo(
    withDatabase(
        withChannel(
            withCurrentUser(
                withChannelMembers(
                    enhance(DraftAndScheduledPost),
                ),
            ),
        ),
    ),
);
