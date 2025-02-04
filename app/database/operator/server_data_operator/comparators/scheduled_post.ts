// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

export function shouldUpdateScheduledPostRecord(e: ScheduledPostModel, n: ScheduledPost) {
    return Boolean(n.update_at > e.updateAt);
}
