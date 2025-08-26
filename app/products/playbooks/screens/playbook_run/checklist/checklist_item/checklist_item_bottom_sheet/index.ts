// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap} from 'rxjs';

import {observePlaybookRunById} from '@playbooks/database/queries/run';
import {observeUser} from '@queries/servers/user';

import ChecklistItemBottomSheet, {BOTTOM_SHEET_HEIGHT} from './checklist_item_bottom_sheet';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    runId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['item', 'runId'], ({item, runId, database}: OwnProps) => {
    if ('observe' in item) {
        const observedItem = item.observe();

        // We don't use assignee query  from the model because if it cannot find the user
        // it will throw an error.
        const assignee = observedItem.pipe(
            switchMap((i) => {
                if (i.assigneeId) {
                    return observeUser(database, i.assigneeId);
                }

                return of$(undefined);
            }),
        );
        return {
            item: observedItem,
            assignee,
            participantIds: observePlaybookRunById(database, runId).pipe(switchMap((run) => of$(run?.participantIds || []))),
        };
    }

    const assignee = observeUser(database, item.assignee_id);

    return {
        item: of$(item),
        assignee,
        participantIds: of$([]),
    };
});

export default withDatabase(enhanced(ChecklistItemBottomSheet));
export {BOTTOM_SHEET_HEIGHT};
