// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {safeParseJSONStringArray} from '@utils/helpers';

import type {Relation} from '@nozbe/watermelondb';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModelInterface from '@playbooks/types/database/models/playbook_checklist_item';
import type {SyncStatus} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

const {USER} = MM_TABLES.SERVER;
const {PLAYBOOK_CHECKLIST_ITEM, PLAYBOOK_CHECKLIST} = PLAYBOOK_TABLES;

/**
 * The PlaybookChecklistItem model represents an item in a checklist in a playbook run.
 */
export default class PlaybookChecklistItemModel extends Model implements PlaybookChecklistItemModelInterface {
    /** table (name) : PlaybookChecklistItem */
    static table = PLAYBOOK_CHECKLIST_ITEM;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A PLAYBOOK_CHECKLIST_ITEM belongs to a PLAYBOOK_CHECKLIST (relationship is N:1) */
        [PLAYBOOK_CHECKLIST]: {type: 'belongs_to', key: 'checklist_id'},

        /** A PLAYBOOK_CHECKLIST_ITEM belongs to a USER (relationship is N:1) */
        [USER]: {type: 'belongs_to', key: 'assignee_id'},
    };

    /** checklist_id: The id of the checklist this checklist item belongs to */
    @field('checklist_id') checklistId!: string;

    /** title : Title of the checklist item */
    @field('title') title!: string;

    /** state : The state of the checklist item */
    @field('state') state!: ChecklistItemState;

    /** state_modified : The timestamp when the checklist item was modified */
    @field('state_modified') stateModified!: number;

    /** assignee_id: The id of the user who is assigned to the checklist item */
    @field('assignee_id') assigneeId!: string | null;

    /** assignee_modified : The timestamp when the assignee was modified */
    @field('assignee_modified') assigneeModified!: number;

    /** command : The slash command associated with the checklist item */
    @field('command') command!: string | null;

    /** command_last_run : The timestamp when the command was last run */
    @field('command_last_run') commandLastRun!: number;

    /** description : The description of the checklist item */
    @field('description') description!: string;

    /** due_date : The due date of the checklist item */
    @field('due_date') dueDate!: number;

    /** completed_at : The timestamp when the checklist item was completed */
    @field('completed_at') completedAt!: number;

    /** task_actions : The JSON string representing the task actions */
    @json('task_actions', safeParseJSONStringArray) taskActions!: TaskAction[];

    /** sync : The sync status of the checklist item */
    @field('sync') sync!: SyncStatus;

    /** last_sync_at : The timestamp when the checklist item was last synced */
    @field('last_sync_at') lastSyncAt!: number;

    /** update_at : The timestamp when the checklist item was updated */
    @field('update_at') updateAt!: number;

    /** checklist : The checklist to which this checklist item belongs */
    @immutableRelation(PLAYBOOK_CHECKLIST, 'checklist_id') checklist!: Relation<PlaybookChecklistModel>;

    /** user : The user to whom this checklist item is assigned */
    @immutableRelation(USER, 'assignee_id') assignee?: Relation<UserModel>;
}
