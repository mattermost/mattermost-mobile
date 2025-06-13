// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import ChecklistItem from './checklist_item';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
} & WithDatabaseArgs;

const enhanced = withObservables(['item'], ({item, database}: OwnProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const asigneeId = 'assigneeId' in item ? item.assigneeId : item.assignee_id;

    // We don't use assignee query  from the model because if it cannot find the user
    // it will throw an error.
    const assignee = asigneeId ? observeUser(database, asigneeId) : of$(undefined);

    if ('observe' in item) {
        return {
            item: item.observe(),
            assignee,
            teammateNameDisplay,
        };
    }

    return {
        item: of$(item),
        assignee,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(ChecklistItem));
