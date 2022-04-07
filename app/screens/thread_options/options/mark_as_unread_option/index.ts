// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import MarkAsUnreadOption from './mark_as_unread_option';

import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables(['thread'], ({thread}: {thread: ThreadModel}) => ({
    post: thread.post.observe(),
}));

export default enhanced(MarkAsUnreadOption);
