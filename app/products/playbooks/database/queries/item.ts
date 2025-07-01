// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

const {PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export const queryPlaybookChecklistItemsByChecklists = (database: Database, checklistId: string[]) => {
    return database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.where('checklist_id', Q.oneOf(checklistId)),
    );
};

export const getPlaybookChecklistItemById = async (database: Database, id: string) => {
    try {
        const item = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).find(id);
        return item;
    } catch {
        return undefined;
    }
};
