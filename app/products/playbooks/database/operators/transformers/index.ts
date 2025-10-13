// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type PlaybookRunAttributeModel from '@playbooks/types/database/models/playbook_run_attribute';
import type PlaybookRunAttributeValueModel from '@playbooks/types/database/models/playbook_run_attribute_value';
import type{TransformerArgs} from '@typings/database/database';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM, PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

/**
 * transformPlaybookRunRecord: Prepares a record of the SERVER database 'PlaybookRun' table for update or create actions.
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<PlaybookRunModel>}
 */
export const transformPlaybookRunRecord = ({action, database, value}: TransformerArgs<PlaybookRunModel, PartialPlaybookRun>): Promise<PlaybookRunModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !value.record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (run: PlaybookRunModel) => {
        run._raw.id = isCreateAction ? (raw?.id ?? run.id) : run.id;
        run.playbookId = raw.playbook_id ?? record?.playbookId ?? '';
        run.postId = raw.post_id ?? record?.postId ?? null;
        run.ownerUserId = raw.owner_user_id ?? record?.ownerUserId ?? '';
        run.teamId = raw.team_id ?? record?.teamId ?? '';
        run.channelId = raw.channel_id ?? record?.channelId ?? '';
        run.createAt = raw.create_at ?? record?.createAt ?? 0;
        run.endAt = raw.end_at ?? (record?.endAt ?? 0);
        run.name = raw.name ?? record?.name ?? '';
        run.description = raw.description ?? record?.description ?? '';
        run.isActive = raw.is_active ?? record?.isActive ?? false;
        run.activeStage = raw.active_stage ?? record?.activeStage ?? 0;
        run.activeStageTitle = raw.active_stage_title ?? record?.activeStageTitle ?? '';
        run.participantIds = raw.participant_ids ?? record?.participantIds ?? [];
        run.summary = raw.summary ?? record?.summary ?? '';
        run.currentStatus = raw.current_status ?? record?.currentStatus ?? 'InProgress';
        run.lastStatusUpdateAt = raw.last_status_update_at ?? record?.lastStatusUpdateAt ?? 0;
        run.previousReminder = raw.previous_reminder ?? record?.previousReminder ?? 0;
        run.retrospectiveEnabled = raw.retrospective_enabled ?? record?.retrospectiveEnabled ?? false;
        run.retrospective = raw.retrospective ?? record?.retrospective ?? '';
        run.retrospectivePublishedAt = raw.retrospective_published_at ?? record?.retrospectivePublishedAt ?? 0;
        run.updateAt = raw.update_at ?? record?.updateAt ?? raw.create_at ?? record?.createAt ?? 0;
        run.lastSyncAt = Date.now();
        run.itemsOrder = raw.items_order ?? record?.itemsOrder ?? [];
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
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<PlaybookChecklistModel>}
 */
export const transformPlaybookChecklistRecord = ({action, database, value}: TransformerArgs<PlaybookChecklistModel, PartialChecklist>): Promise<PlaybookChecklistModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (checklist: PlaybookChecklistModel) => {
        checklist._raw.id = isCreateAction ? (raw?.id ?? checklist.id) : record!.id;
        checklist.runId = raw.run_id ?? record?.runId;
        checklist.title = raw.title ?? record?.title ?? '';
        checklist.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        checklist.lastSyncAt = Date.now();
        checklist.itemsOrder = raw.items_order ?? record?.itemsOrder ?? [];
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
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<PlaybookChecklistItemModel>}
 */
export const transformPlaybookChecklistItemRecord = ({action, database, value}: TransformerArgs<PlaybookChecklistItemModel, PartialChecklistItem>): Promise<PlaybookChecklistItemModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (item: PlaybookChecklistItemModel) => {
        item._raw.id = isCreateAction ? (raw?.id ?? item.id) : record!.id;
        item.checklistId = raw.checklist_id ?? record?.checklistId;
        item.title = raw.title ?? record?.title ?? '';
        item.state = raw.state ?? record?.state ?? '';
        item.stateModified = raw.state_modified ?? record?.stateModified ?? 0;
        item.assigneeId = raw.assignee_id ?? record?.assigneeId ?? null;
        item.assigneeModified = raw.assignee_modified ?? record?.assigneeModified ?? 0;
        item.command = raw.command ?? record?.command ?? null;
        item.commandLastRun = raw.command_last_run ?? record?.commandLastRun ?? 0;
        item.description = raw.description ?? record?.description ?? '';
        item.dueDate = raw.due_date ?? record?.dueDate ?? 0;
        item.completedAt = raw.completed_at ?? record?.completedAt ?? 0;
        item.taskActions = raw.task_actions ?? record?.taskActions ?? [];
        item.conditionAction = raw.condition_action ?? record?.conditionAction ?? '';
        item.conditionReason = raw.condition_reason ?? record?.conditionReason ?? '';
        item.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        item.lastSyncAt = Date.now();
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_CHECKLIST_ITEM,
        value,
        fieldsMapper,
    });
};

/**
 * transformPlaybookRunAttributeRecord: Prepares a record of the SERVER database 'PlaybookRunAttribute' table for update or create actions.
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<PlaybookRunAttributeModel>}
 */
export const transformPlaybookRunAttributeRecord = ({action, database, value}: TransformerArgs<PlaybookRunAttributeModel, PartialPlaybookRunAttribute>): Promise<PlaybookRunAttributeModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (attribute: PlaybookRunAttributeModel) => {
        attribute._raw.id = isCreateAction ? (raw?.id ?? attribute.id) : record!.id;
        attribute.groupId = raw.group_id ?? record?.groupId ?? '';
        attribute.name = raw.name ?? record?.name ?? '';
        attribute.type = raw.type ?? record?.type ?? '';
        attribute.targetId = raw.target_id ?? record?.targetId ?? '';
        attribute.targetType = raw.target_type ?? record?.targetType ?? '';
        attribute.createAt = raw.create_at ?? record?.createAt ?? 0;
        attribute.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        attribute.deleteAt = raw.delete_at ?? record?.deleteAt ?? 0;
        attribute.attrs = raw.attrs ?? record?.attrs ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_RUN_ATTRIBUTE,
        value,
        fieldsMapper,
    });
};

/**
 * transformPlaybookRunAttributeValueRecord: Prepares a record of the SERVER database 'PlaybookRunAttributeValue' table for update or create actions.
 * @param {TransformerArgs} transformerArgs
 * @param {Database} transformerArgs.database
 * @param {RecordPair} transformerArgs.value
 * @returns {Promise<PlaybookRunAttributeValueModel>}
 */
export const transformPlaybookRunAttributeValueRecord = ({action, database, value}: TransformerArgs<PlaybookRunAttributeValueModel, PartialPlaybookRunAttributeValue>): Promise<PlaybookRunAttributeValueModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (attribute: PlaybookRunAttributeValueModel) => {
        attribute._raw.id = isCreateAction ? (raw?.id ?? attribute.id) : record!.id;
        attribute.attributeId = raw.attribute_id ?? record?.attributeId ?? '';
        attribute.runId = raw.run_id ?? record?.runId ?? '';
        attribute.value = raw.value ?? record?.value ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PLAYBOOK_RUN_ATTRIBUTE_VALUE,
        value,
        fieldsMapper,
    });
};
