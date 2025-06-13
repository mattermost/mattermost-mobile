// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {isItemCompleted} from '@playbooks/utils/progress';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type UserModel from '@typings/database/models/servers/user';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;
const {USER, MY_CHANNEL} = MM_TABLES.SERVER;

export const queryPlaybookRunsPerChannel = (database: Database, channelId: string, finished?: boolean) => {
    const conditions = [Q.where('channel_id', channelId)];
    if (finished != null) {
        conditions.push(Q.where('end_at', finished ? Q.notEq(0) : Q.eq(0)));
    }

    return database.get<PlaybookRunModel>(PLAYBOOK_RUN).query(
        Q.and(...conditions),
        Q.sortBy('create_at', 'desc'),
    );
};

export const getPlaybookRunById = async (database: Database, id: string) => {
    try {
        const run = await database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(id);
        return run;
    } catch {
        return undefined;
    }
};

export const observePlaybookRunById = (database: Database, id: string) => {
    return database.get<PlaybookRunModel>(PLAYBOOK_RUN).query(
        Q.where('id', id),
        Q.take(1),
    ).observe().pipe(
        switchMap((run) => {
            return run.length ? run[0].observe() : of$(undefined);
        }),
    );
};

export const observePlaybookRunsPerChannel = (database: Database, channelId: string, finished?: boolean) => {
    return queryPlaybookRunsPerChannel(database, channelId, finished).observe();
};

export const observePlaybookRunProgress = (database: Database, runId: string) => {
    const items = database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.on(PLAYBOOK_CHECKLIST, 'run_id', runId),
    ).observeWithColumns(['state']);

    return items.pipe(
        switchMap((checklistsItems) => {
            const totalItems = checklistsItems.length;

            if (totalItems === 0) {
                return of$(0);
            }

            const completedItems = checklistsItems.filter(isItemCompleted).length;

            return of$(parseFloat(((completedItems / totalItems) * 100).toFixed(2)));
        }),
    );
};

export const observePlaybookRunParticipants = (database: Database, runId: string) => {
    const playbookRunObservable = observePlaybookRunById(database, runId);

    // Map the observable to fetch participants
    return playbookRunObservable.pipe(
        switchMap((playbookRun) => {
            if (!playbookRun) {
                return of$([]);
            }

            // Query the User table for the participants
            return database.get<UserModel>(USER).query(
                Q.where('id', Q.oneOf(playbookRun.participantIds)),
            ).observe();
        }),
        map((users) => (users || [])),
    );
};

export const getLastPlaybookFetchAt = async (database: Database, channelId: string) => {
    const myChannel = await database.get<MyChannelModel>(MY_CHANNEL).query(
        Q.where('id', channelId),
    ).fetch();
    return myChannel[0]?.lastPlaybookFetchAt || 0;
};
