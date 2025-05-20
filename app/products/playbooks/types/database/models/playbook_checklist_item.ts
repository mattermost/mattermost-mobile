// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistModel from './playbook_checklist';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type UserModel from '@typings/database/models/servers/user';

/**
 * The PlaybookChecklistItem model represents a playbook run in the Mattermost app.
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

    // Order of the checklist item
    order: number;

    // state of the checklist item (todo, in_progress, done)
    state: string;

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
    sync: string;

    // The timestamp when the checklist item was last synced
    lastSyncAt: number;

    // JSON string representing the task actions
    taskActions: TaskAction[] | null;

    /** checklist : The checklist to which this checklist item belongs */
    checklist: Relation<PlaybookChecklistModel>;

    /** assignee : The user who is assigned to the checklist item */
    assignee: Relation<UserModel>;
}

export default PlaybookChecklistItemModel;
