// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {type Observable} from 'rxjs';

import {DRAFT_TYPE_DRAFT, type DraftType} from '@constants/draft';
import {observeChannel} from '@queries/servers/channel';
import {observeDraftById} from '@queries/servers/drafts';
import {observeScheduledPostById} from '@queries/servers/scheduled_post';

import DraftSchedulePostOptions, {DRAFT_OPTIONS_BUTTON} from './draft_scheduled_post_options';

import type {WithDatabaseArgs} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

export {DRAFT_OPTIONS_BUTTON};

export type DraftScheduledPostProps = {
    draftType: DraftType;
    channelId: string;
    rootId: string;
    draftId: string;
    draftReceiverUserName: string | undefined;
}

const enhance = withObservables([], ({database, channelId, draftType, draftId}: DraftScheduledPostProps & WithDatabaseArgs) => {
    let draft: Observable<DraftModel | ScheduledPostModel>;

    if (draftType === DRAFT_TYPE_DRAFT) {
        draft = observeDraftById(database, draftId);
    } else {
        draft = observeScheduledPostById(database, draftId);
    }

    const channel = observeChannel(database, channelId);

    return {
        draft,
        channel,
    };
});

export default withDatabase(enhance(DraftSchedulePostOptions));
