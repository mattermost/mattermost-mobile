// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import ChannelAddMembers from './channel_add_members';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
} & WithDatabaseArgs;
const enhanced = withObservables(['channelId'], ({database, channelId}: OwnProps) => {
    const channel = observeChannel(database, channelId);

    return {
        channel,
        teammateNameDisplay: observeTeammateNameDisplay(database),
        tutorialWatched: observeTutorialWatched(Tutorial.PROFILE_LONG_PRESS),
    };
});

export default withDatabase(enhanced(ChannelAddMembers));
