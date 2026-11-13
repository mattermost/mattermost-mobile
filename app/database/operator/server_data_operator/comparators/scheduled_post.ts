// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

// Rows cached before the recurrence columns existed hold '' for them until the server next bumps
// update_at, which for a weekly post can be a week away, so a recurrence mismatch also refreshes the row.
export function shouldUpdateScheduledPostRecord(e: ScheduledPostModel, n: ScheduledPost) {
    return Boolean(
        n.update_at > e.updateAt ||
        (n.repeat_type ?? '') !== e.repeatType ||
        (n.repeat_timezone ?? '') !== e.repeatTimezone,
    );
}
