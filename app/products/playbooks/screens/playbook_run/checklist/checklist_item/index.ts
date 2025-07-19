// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap} from 'rxjs';

import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import ChecklistItem from './checklist_item';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
} & WithDatabaseArgs;

const enhanced = withObservables(['item'], ({item, database}: OwnProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);

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
            teammateNameDisplay,
        };
    }

    const assignee = observeUser(database, item.assignee_id);

    return {
        item: of$(item),
        assignee,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(ChecklistItem));
