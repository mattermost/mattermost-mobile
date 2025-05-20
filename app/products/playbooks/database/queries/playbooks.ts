// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type UserModel from '@typings/database/models/servers/user';

export function queryActivePlaybookRunsPerChannel(database: Database, channelId: string) {
    const model = {
        id: 'playbook_run_id',
        playbookId: 'playbook_id',
        channelId,
    } as PlaybookRunModel;
    return {
        observe: () => of$([model]),
        observeCount: () => of$(1),
        fetch: async () => [model],
    };
}

export function queryPlaybookRunsPerChannel(database: Database, channelId: string) {
    const model1: PlaybookRunModel = {
        id: 'playbook_run_id1',
        playbookId: 'playbook_id',
        name: 'Playbook Run 1',
        participantIds: ['user_id_1', 'user_id_2'],
        ownerUserId: 'user_id_1',
        channelId,
    } as PlaybookRunModel;
    const model2: PlaybookRunModel = {
        id: 'playbook_run_id2',
        playbookId: 'playbook_id2',
        name: 'Playbook Run 2',
        participantIds: ['user_id_3', 'user_id_4'],
        ownerUserId: 'user_id_3',
        channelId,
    } as PlaybookRunModel;
    return {
        observe: () => of$([model1, model2]),
        observeCount: () => of$(2),
        fetch: async () => [model1, model2],
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function observePlaybookRunProgress(database: Database, runId: string) {
    return of$(50);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function observePlaybookName(database: Database, playbookId: string) {
    return of$('Playbook Name');
}

export function observePlaybookRun(database: Database, runId: string) {
    const mockUser: UserModel = {
        id: 'user_id_1',
        username: 'User 1',
    } as UserModel;
    mockUser.observe = () => of$(mockUser);
    const model1: PlaybookRunModel = {
        id: runId,
        playbookId: 'playbook_id',
        name: 'Onboarding: Alden Wollefson',
        participantIds: ['user_id_1', 'user_id_2'],
        ownerUserId: 'user_id_1',
        description: `[Salesforce Opportunity Record](https://www.google.com)
Seat count: 234
ARR: $27,200
Go live: 2025-01-01
[Customer channel](https://www.google.com)`,
        participants: {
            observe: () => of$([
                mockUser,
            ]),
        },
        owner: {
            observe: () => of$(mockUser),
        },
    } as PlaybookRunModel;
    return of$(model1);
}

export function observeChecklists(database: Database, runId: string) {
    const checklist1: PlaybookChecklistModel = {
        id: 'checklist_id1',
        runId,
        title: 'Checklist 1',
        order: 1,
        sync: 'synced',
        lastSyncAt: 1620000000000,
    } as PlaybookChecklistModel;
    checklist1.items.observe = () => of$([
        {
            id: 'item_id1',
            checklistId: 'checklist_id1',
            title: 'Item 1',
            assigneeId: 'user_id_1',
            description: 'Item 1 description',
            dueDate: 1620000000000,
            command: 'item1',
            assignee: {
                observe: () => of$({
                    id: 'user_id_1',
                    username: 'User 1',
                } as UserModel),
            },
        } as PlaybookChecklistItemModel,
        {
            id: 'item_id2',
            checklistId: 'checklist_id1',
            title: 'Item 1',
            assigneeId: 'user_id_1',
            description: 'Item 1 description',
            dueDate: 1620000000000,
            command: 'item1',
            assignee: {
                observe: () => of$({
                    id: 'user_id_1',
                    username: 'User 1',
                } as UserModel),
            },
        } as PlaybookChecklistItemModel,
    ]);
    const checklist2: PlaybookChecklistModel = {
        id: 'checklist_id2',
        runId,
        title: 'Checklist 2',
        order: 2,
        sync: 'synced',
        lastSyncAt: 1620000000000,
    } as PlaybookChecklistModel;
    checklist2.items.observe = () => of$([
        {
            id: 'item_id2',
            checklistId: 'checklist_id2',
            title: 'Item 2',
            assigneeId: 'user_id_1',
            description: 'Item 2 description',
            dueDate: 1620000000000,
            command: 'item2',
            assignee: {
                observe: () => of$({
                    id: 'user_id_1',
                    username: 'User 1',
                } as UserModel),
            },
        } as PlaybookChecklistItemModel,
    ]);
    return of$([checklist1, checklist2]);
}
