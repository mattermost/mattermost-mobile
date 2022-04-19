// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import {observeTeamIdByThread} from '@queries/servers/thread';

import FollowThreadOption from './follow_thread_option';

import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables(['thread'], ({thread}: { thread: ThreadModel }) => {
    return {
        teamId: observeTeamIdByThread(thread),
    };
});

export default enhanced(FollowThreadOption);
