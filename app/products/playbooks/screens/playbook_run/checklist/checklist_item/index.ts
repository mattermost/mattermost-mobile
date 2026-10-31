// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, distinctUntilChanged, of as of$, shareReplay, switchMap} from 'rxjs';
import {map} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observePlaybookRunById} from '@playbooks/database/queries/run';
import {observeIsTaskRequirementsEnabled} from '@playbooks/database/queries/settings';
import {observeChannel} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import ChecklistItem from './checklist_item';
import {getTaskActivity, isSameTaskActivity} from './task_activity';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    timelineEvents: TimelineEvent[] | undefined;
    channelId: string;
    playbookRunId: string;
} & WithDatabaseArgs;

// timelineEvents is set only for a run that is not in the database. For a persisted run it stays
// undefined, because a changing trigger makes withObservables blank the row until it re-subscribes.
const enhanced = withObservables(['item', 'channelId', 'playbookRunId', 'timelineEvents'], ({item, timelineEvents, database, channelId, playbookRunId}: OwnProps) => {
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const currentUserId = observeCurrentUserId(database);
    const timezone = observeCurrentUser(database).pipe(map((u) => getTimezone(u?.timezone)));
    const isMilitaryTime = queryDisplayNamePreferences(database).observeWithColumns(['value']).pipe(
        switchMap((preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME))),
    );
    const channelType = observeChannel(database, channelId).pipe(switchMap((c) => of$(c?.type || General.OPEN_CHANNEL)));
    const taskRequirementsEnabled = observeIsTaskRequirementsEnabled(database);

    if ('observe' in item) {
        const observedItem = item.observe().pipe(
            shareReplay({bufferSize: 1, refCount: true}),
        );

        const run = observePlaybookRunById(database, playbookRunId).pipe(
            shareReplay({bufferSize: 1, refCount: true}),
        );

        const activity = combineLatest([observedItem, run]).pipe(
            map(([i, r]) => getTaskActivity(i, r?.timelineEvents ?? timelineEvents)),
            distinctUntilChanged(isSameTaskActivity),
            shareReplay({bufferSize: 1, refCount: true}),
        );

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
            taskRequirementsEnabled,
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
        taskRequirementsEnabled,
    };
});

export default withDatabase(enhanced(ChecklistItem));
