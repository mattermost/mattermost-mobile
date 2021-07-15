// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsInChannelEqualToRaw,
    isRecordGroupsInTeamEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupsInChannelRecord,
    transformGroupsInTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {HandleGroupArgs, HandleGroupMembershipArgs, HandleGroupsInChannelArgs, HandleGroupsInTeamArgs} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsInChannelModel from '@typings/database/models/servers/groups_in_channel';
import type GroupsInTeamModel from '@typings/database/models/servers/groups_in_team';

const {
    GROUP,
    GROUPS_IN_CHANNEL,
    GROUPS_IN_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

export interface GroupHandlerMix {
    handleGroupMembership: ({groupMemberships, prepareRecordsOnly}: HandleGroupMembershipArgs) => Promise<GroupMembershipModel[]>;
    handleGroup: ({groups, prepareRecordsOnly}: HandleGroupArgs) => Promise<GroupModel[]>;
    handleGroupsInTeam: ({groupsInTeams, prepareRecordsOnly}: HandleGroupsInTeamArgs) => Promise<GroupsInTeamModel[]>;
    handleGroupsInChannel: ({groupsInChannels, prepareRecordsOnly}: HandleGroupsInChannelArgs) => Promise<GroupsInChannelModel[]>;
}

const GroupHandler = (superclass: any) => class extends superclass {
    /**
     * handleGroupMembership: Handler responsible for the Create/Update operations occurring on the GROUP_MEMBERSHIP table from the 'Server' schema
     * @param {HandleGroupMembershipArgs} groupMembershipsArgs
     * @param {RawGroupMembership[]} groupMembershipsArgs.groupMemberships
     * @param {boolean} groupMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupMembershipModel[]>}
     */
    handleGroupMembership = ({groupMemberships, prepareRecordsOnly = true}: HandleGroupMembershipArgs): Promise<GroupMembershipModel[]> => {
        if (!groupMemberships.length) {
            throw new DataOperatorException(
                'An empty "groupMemberships" array has been passed to the handleGroupMembership method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupMemberships, key: 'group_id'});

        return this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
            transformer: transformGroupMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUP_MEMBERSHIP,
        });
    };

    /**
     * handleGroup: Handler responsible for the Create/Update operations occurring on the GROUP table from the 'Server' schema
     * @param {HandleGroupArgs} groupsArgs
     * @param {RawGroup[]} groupsArgs.groups
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupModel[]>}
     */
    handleGroup = ({groups, prepareRecordsOnly = true}: HandleGroupArgs): Promise<GroupModel[]> => {
        if (!groups.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroup method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groups, key: 'name'});

        return this.handleRecords({
            fieldName: 'name',
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            transformer: transformGroupRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUP,
        });
    };

    /**
     * handleGroupsInTeam: Handler responsible for the Create/Update operations occurring on the GROUPS_IN_TEAM table from the 'Server' schema
     * @param {HandleGroupsInTeamArgs} groupsInTeamsArgs
     * @param {RawGroupsInTeam[]} groupsInTeamsArgs.groupsInTeams
     * @param {boolean} groupsInTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupsInTeamModel[]>}
     */
    handleGroupsInTeam = ({groupsInTeams, prepareRecordsOnly = true}: HandleGroupsInTeamArgs): Promise<GroupsInTeamModel[]> => {
        if (!groupsInTeams.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsInTeam method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupsInTeams, key: 'group_id'});

        return this.handleRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsInTeamEqualToRaw,
            transformer: transformGroupsInTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUPS_IN_TEAM,
        });
    };

    /**
     * handleGroupsInChannel: Handler responsible for the Create/Update operations occurring on the GROUPS_IN_CHANNEL table from the 'Server' schema
     * @param {HandleGroupsInChannelArgs} groupsInChannelsArgs
     * @param {RawGroupsInChannel[]} groupsInChannelsArgs.groupsInChannels
     * @param {boolean} groupsInChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupsInChannelModel[]>}
     */
    handleGroupsInChannel = ({groupsInChannels, prepareRecordsOnly = true}: HandleGroupsInChannelArgs): Promise<GroupsInChannelModel[]> => {
        if (!groupsInChannels.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsInTeam method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupsInChannels, key: 'channel_id'});

        return this.handleRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsInChannelEqualToRaw,
            transformer: transformGroupsInChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUPS_IN_CHANNEL,
        });
    };
};

export default GroupHandler;
