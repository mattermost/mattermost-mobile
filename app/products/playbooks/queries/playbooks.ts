// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function queryActivePlaybookRunsPerChannel(database: Database, channelId: string) {
    const model = {
        id: 'playbook_run_id',
        playbookId: 'playbook_id',
    } as PlaybookRunModel;
    return {
        observe: () => of$([model]),
        observeCount: () => of$(1),
        fetch: async () => [model],
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function queryPlaybookRunsPerChannel(database: Database, channelId: string) {
    const model1: PlaybookRunModel = {
        id: 'playbook_run_id1',
        playbookId: 'playbook_id',
        name: 'Playbook Run 1',
        participantIds: ['user_id1', 'user_id2'],
    } as PlaybookRunModel;
    const model2: PlaybookRunModel = {
        id: 'playbook_run_id2',
        playbookId: 'playbook_id2',
        name: 'Playbook Run 2',
        participantIds: ['user_id1', 'user_id2'],
    } as PlaybookRunModel;
    return {
        observe: () => of$([model1, model2]),
        observeCount: () => of$(2),
        fetch: async () => [model1, model2],
    };
}
