// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@typings/database/models/servers/playbook_run_model';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function queryActivePlaybookRunsPerChannel(database: Database, channelId: string) {
    const model = {
        id: 'playbook_run_id',
        playbook_id: 'playbook_id',
    } as PlaybookRunModel;
    return {
        observe: () => of$([model]),
        observeCount: () => of$(1),
        fetch: async () => [model],
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function queryPlaybookRunsPerChannel(database: Database, channelId: string) {
    const model1 = {
        id: 'playbook_run_id1',
        playbook_id: 'playbook_id',
    } as PlaybookRunModel;
    const model2 = {
        id: 'playbook_run_id2',
        playbook_id: 'playbook_id2',
    } as PlaybookRunModel;
    return {
        observe: () => of$([model1, model2]),
        observeCount: () => of$(2),
        fetch: async () => [model1, model2],
    };
}
