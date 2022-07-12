// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';
import {generateGroupAssociationId} from '@utils/groups';

import type {TransformerArgs} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';

const {
    GROUP,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

/**
  * transformGroupRecord: Prepares a record of the SERVER database 'Group' table for update or create actions.
  * @param {TransformerArgs} operator
  * @param {Database} operator.database
  * @param {RecordPair} operator.value
  * @returns {Promise<GroupModel>}
  */
export const transformGroupRecord = ({action, database, value}: TransformerArgs): Promise<GroupModel> => {
    const raw = value.raw as Group;
    const record = value.record as GroupModel;
    const isCreateAction = action === OperationType.CREATE;

    // id of group comes from server response
    const fieldsMapper = (group: GroupModel) => {
        group._raw.id = isCreateAction ? (raw?.id ?? group.id) : record.id;
        group.name = raw.name;
        group.displayName = raw.display_name;
        group.source = raw.source;
        group.remoteId = raw.remote_id;
        group.memberCount = raw.member_count || 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP,
        value,
        fieldsMapper,
    }) as Promise<GroupModel>;
};

/**
   * transformGroupMembershipRecord: Prepares a record of the SERVER database 'GroupMembership' table for update or create actions.
   * @param {TransformerArgs} operator
   * @param {Database} operator.database
   * @param {RecordPair} operator.value
   * @returns {Promise<GroupMembershipModel>}
   */
export const transformGroupMembershipRecord = ({action, database, value}: TransformerArgs): Promise<GroupMembershipModel> => {
    const raw = value.raw as GroupMembership;

    // id of group comes from server response
    const fieldsMapper = (model: GroupMembershipModel) => {
        model._raw.id = raw.id || generateGroupAssociationId(raw.group_id, raw.user_id);
        model.groupId = raw.group_id;
        model.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: GROUP_MEMBERSHIP,
        value,
        fieldsMapper,
    }) as Promise<GroupMembershipModel>;
};
