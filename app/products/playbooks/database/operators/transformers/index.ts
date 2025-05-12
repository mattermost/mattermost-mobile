// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type{TransformerArgs} from '@typings/database/database';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

/**
 * transformPlaybookRunRecord: Prepares a record of the SERVER database 'PlaybookRun' table for update or create actions.
 * @param {TransformerArgs} transoformerArgs
 * @param {Database} transoformerArgs.database
 * @param {RecordPair} transoformerArgs.value
 * @returns {Promise<PlaybookRunModel>}
 */
export const transformPlaybookRunRecord = ({action, database, value}: TransformerArgs<PlaybookRunModel, PlaybookRun>): Promise<PlaybookRunModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (run: PlaybookRunModel) => {
        run._raw.id = isCreateAction ? (raw?.id ?? run.id) : record!.id;
        run.playbookId = raw.playbook_id;
        run.postId = raw.post_id ?? null;
        run.ownerUserId = raw.owner_user_id;
        run.teamId = raw.team_id;
        run.channelId = raw.channel_id;
        run.createAt = raw.create_at;
        run.endAt = raw.end_at || raw.end_at === 0 ? raw?.end_at : 0;
        run.deleteAt = raw.delete_at || raw.delete_at === 0 ? raw?.delete_at : 0;
        run.name = raw.name;
        run.description = raw.description;
        run.isActive = raw.is_active;
        run.activeStage = raw.active_stage;
        run.activeStageTitle = raw.active_stage_title;
        run.participantIds = raw.participant_ids;
        run.summary = raw.summary;
        run.currentStatus = raw.current_status;
        run.lastStatusUpdateAt = raw.last_status_update_at;
        run.retrospectiveEnabled = raw.retrospective_enabled;
        run.retrospective = raw.retrospective;
        run.retrospectivePublishedAt = raw.retrospective_published_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_RUN,
        value,
        fieldsMapper,
    });
};

/**
 * transformPlaybookChecklistRecord: Prepares a record of the SERVER database 'PlaybookChecklist' table for update or create actions.
 * @param {TransformerArgs} transoformerArgs
 * @param {Database} transoformerArgs.database
 * @param {RecordPair} transoformerArgs.value
 * @returns {Promise<PlaybookChecklistModel>}
 */
export const transformPlaybookChecklistRecord = ({action, database, value}: TransformerArgs<PlaybookChecklistModel, PlaybookChecklistWithRun>): Promise<PlaybookChecklistModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (checklist: PlaybookChecklistModel) => {
        checklist._raw.id = isCreateAction ? (raw?.id ?? checklist.id) : record!.id;
        checklist.runId = raw.run_id;
        checklist.title = raw.title;
        checklist.order = raw.order;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_CHECKLIST,
        value,
        fieldsMapper,
    });
};

/**
 * transformPlaybookChecklistItemRecord: Prepares a record of the SERVER database 'PlaybookChecklistItem' table for update or create actions.
 * @param {TransformerArgs} transoformerArgs
 * @param {Database} transoformerArgs.database
 * @param {RecordPair} transoformerArgs.value
 * @returns {Promise<PlaybookChecklistItemModel>}
 */
export const transformPlaybookChecklistItemRecord = ({action, database, value}: TransformerArgs<PlaybookChecklistItemModel, PlaybookChecklistItemWithChecklist>): Promise<PlaybookChecklistItemModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (item: PlaybookChecklistItemModel) => {
        item._raw.id = isCreateAction ? (raw?.id ?? item.id) : record!.id;
        item.checklistId = raw.checklist_id;
        item.title = raw.title;
        item.order = raw.order;
        item.state = raw.state;
        item.stateModified = raw.state_modified || raw.state_modified === 0 ? raw?.state_modified : 0;
        item.assigneeId = raw.assignee_id ?? null;
        item.assigneeModified = raw.assignee_modified || raw.assignee_modified === 0 ? raw?.assignee_modified : 0;
        item.command = raw.command;
        item.commandLastRun = raw.command_last_run || raw.command_last_run === 0 ? raw?.command_last_run : 0;
        item.description = raw.description;
        item.dueDate = raw.due_date || raw.due_date === 0 ? raw?.due_date : 0;
        item.completedAt = raw.completed_at || raw.completed_at === 0 ? raw?.completed_at : 0;
        item.taskActions = raw.task_actions ?? null;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_CHECKLIST_ITEM,
        value,
        fieldsMapper,
    });
};
