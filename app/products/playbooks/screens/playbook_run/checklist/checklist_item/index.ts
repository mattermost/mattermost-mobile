// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap} from 'rxjs';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import ChecklistItem from './checklist_item';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['item', 'channelId'], ({item, database, channelId}: OwnProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const currentUserId = observeCurrentUserId(database);
    const channelType = observeChannel(database, channelId).pipe(switchMap((c) => of$(c?.type || General.OPEN_CHANNEL)));

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
            currentUserId,
            channelType,
        };
    }

    const assignee = observeUser(database, item.assignee_id);

    return {
        item: of$(item),
        assignee,
        teammateNameDisplay,
        currentUserId,
        channelType,
    };
});

export default withDatabase(enhanced(ChecklistItem));
