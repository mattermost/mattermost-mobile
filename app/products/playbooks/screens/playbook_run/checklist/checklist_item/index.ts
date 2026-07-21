// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap} from 'rxjs';
import {map} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeChannel} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import ChecklistItem from './checklist_item';
import {getTaskActivity} from './task_activity';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    timelineEvents: TimelineEvent[];
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['item', 'channelId', 'timelineEvents'], ({item, timelineEvents, database, channelId}: OwnProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const currentUserId = observeCurrentUserId(database);
    const timezone = observeCurrentUser(database).pipe(map((u) => getTimezone(u?.timezone)));
    const isMilitaryTime = queryDisplayNamePreferences(database).observeWithColumns(['value']).pipe(
        switchMap((preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME))),
    );
    const channelType = observeChannel(database, channelId).pipe(switchMap((c) => of$(c?.type || General.OPEN_CHANNEL)));

    if ('observe' in item) {
        const observedItem = item.observe();
        const activity = observedItem.pipe(map((i) => getTaskActivity(i, timelineEvents)));

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
        const activityActor = activity.pipe(
            switchMap((a) => (a?.actorUserId ? observeUser(database, a.actorUserId) : of$(undefined))),
        );
        return {
            item: observedItem,
            assignee,
            activity,
            activityActor,
            teammateNameDisplay,
            timezone,
            isMilitaryTime,
            currentUserId,
            channelType,
        };
    }

    const assignee = observeUser(database, item.assignee_id);
    const activity = getTaskActivity(item, timelineEvents);

    return {
        item: of$(item),
        assignee,
        activity: of$(activity),
        activityActor: activity?.actorUserId ? observeUser(database, activity.actorUserId) : of$(undefined),
        teammateNameDisplay,
        timezone,
        isMilitaryTime,
        currentUserId,
        channelType,
    };
});

export default withDatabase(enhanced(ChecklistItem));
