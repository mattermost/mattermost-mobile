// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistModel from './playbook_checklist';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type {SyncStatus} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

/**
 * The PlaybookChecklistItem model represents an item in a checklist in a playbook run.
 */
declare class PlaybookChecklistItemModel extends Model {
    /** table (name) : PlaybookChecklistItem */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    // Foreign key to the playbook checklist that generated this run
    checklistId: string;

    // title of the checklist item
    title: string;

    // state of the checklist item (in_progress, closed, skipped or open (empty string))
    state: ChecklistItemState;

    // timestamp when the checklist item was modified
    stateModified: number;

    // ID of the user who is assigned to the checklist item (nullable)
    assigneeId: string | null;

    // timestamp when the assignee was modified
    assigneeModified: number;

    // Slash command associated with the checklist item (nullable)
    command: string | null;

    // Timestamp when the command was last run
    commandLastRun: number;

    // Description of the checklist item
    description: string;

    // Due date of the checklist item (0 if no due date)
    dueDate: number;

    // Timestamp when the checklist item was completed (0 if not completed)
    completedAt: number;

    // The sync status of the checklist item
    sync: SyncStatus;

    // The timestamp when the checklist item was last synced
    lastSyncAt: number;

    // JSON string representing the task actions
    taskActions: TaskAction[];

    // The timestamp when the checklist item was updated
    updateAt: number;

    /** checklist : The checklist to which this checklist item belongs */
    checklist: Relation<PlaybookChecklistModel>;

    /** assignee : The user to whom this checklist item is assigned */
    assignee?: Relation<UserModel>;
}

export default PlaybookChecklistItemModel;
