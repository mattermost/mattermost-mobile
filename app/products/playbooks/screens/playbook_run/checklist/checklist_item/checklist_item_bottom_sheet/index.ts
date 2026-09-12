// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, map, of as of$, shareReplay, switchMap} from 'rxjs';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeParticipantsIdsFromPlaybookModel, observePlaybookRunById} from '@playbooks/database/queries/run';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser, observeUser} from '@queries/servers/user';

import {getTaskActivity} from '../task_activity';

import ChecklistItemBottomSheet, {BOTTOM_SHEET_HEIGHT} from './checklist_item_bottom_sheet';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    runId: string;
    timelineEvents: TimelineEvent[] | undefined;
} & WithDatabaseArgs;

// timelineEvents is a trigger, which is only safe because it never churns for a persisted run: a
// trigger change makes withObservables render null until every observable re-emits, emptying the
// sheet while the user is reading it.
const enhanced = withObservables(['item', 'runId', 'timelineEvents'], ({item, runId, timelineEvents, database}: OwnProps) => {
    const currentUserTimezone = observeCurrentUser(database).pipe(switchMap((u) => of$(u?.timezone)));
    const isMilitaryTime = queryDisplayNamePreferences(database).observeWithColumns(['value']).pipe(
        switchMap((preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME))),
    );

    if ('observe' in item) {
        // Shared because the item is handed to the component and derived into the activity and the
        // assignee below, and each of those would otherwise observe the record on its own.
        const observedItem = item.observe().pipe(
            shareReplay({bufferSize: 1, refCount: true}),
        );

        // Shared because the run feeds the participants, the name and the timeline events below.
        const run = observePlaybookRunById(database, runId).pipe(
            shareReplay({bufferSize: 1, refCount: true}),
        );

        // Resolved here rather than received from the checklist item row so that an open sheet keeps
        // up with the task being checked, skipped or restored elsewhere.
        const activity = combineLatest([observedItem, run]).pipe(
            map(([i, r]) => getTaskActivity(i, r?.timelineEvents ?? timelineEvents)),
            shareReplay({bufferSize: 1, refCount: true}),
        );
        const activityActor = activity.pipe(
            switchMap((a) => (a?.actorUserId ? observeUser(database, a.actorUserId) : of$(undefined))),
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
        return {
            item: observedItem,
            assignee,
            activity,
            activityActor,
            currentUserTimezone,
            isMilitaryTime,
            participantIds: run.pipe(
                switchMap((r) => observeParticipantsIdsFromPlaybookModel(r, true)),
            ),
            runName: run.pipe(map((r) => r?.name || '')),
        };
    }

    const assignee = observeUser(database, item.assignee_id);
    const activity = getTaskActivity(item, timelineEvents);

    return {
        item: of$(item),
        assignee,
        activity: of$(activity),
        activityActor: activity?.actorUserId ? observeUser(database, activity.actorUserId) : of$(undefined),
        currentUserTimezone,
        isMilitaryTime,
        participantIds: of$([]),
        runName: of$(''),
    };
});

export default withDatabase(enhanced(ChecklistItemBottomSheet));
export {BOTTOM_SHEET_HEIGHT};
