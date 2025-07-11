// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';

const {PLAYBOOK_CHECKLIST} = PLAYBOOK_TABLES;

export const queryPlaybookChecklistByRun = (database: Database, runId: string) => {
    return database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).query(
        Q.where('run_id', runId),
    );
};

export const getPlaybookChecklistById = async (database: Database, id: string) => {
    try {
        const checklist = await database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).find(id);
        return checklist;
    } catch {
        return undefined;
    }
};

