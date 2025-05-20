// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeTeammateNameDisplay} from '@queries/servers/user';

import ChecklistItem from './checklist_item';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel;
} & WithDatabaseArgs;

const enhanced = withObservables(['item'], ({item, database}: OwnProps) => {
    return {
        assignee: item.assignee.observe(),
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(enhanced(ChecklistItem));
