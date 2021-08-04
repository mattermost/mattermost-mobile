// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsChannelEqualToRaw,
    isRecordGroupsTeamEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupsChannelRecord,
    transformGroupsTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {HandleGroupArgs, HandleGroupMembershipArgs, HandleGroupsChannelArgs, HandleGroupsTeamArgs} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
import type GroupsTeamModel from '@typings/database/models/servers/groups_team';

const {
    GROUP,
    GROUPS_CHANNEL,
    GROUPS_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

export interface GroupHandlerMix {
    handleGroupMembership: ({groupMemberships, prepareRecordsOnly}: HandleGroupMembershipArgs) => Promise<GroupMembershipModel[]>;
    handleGroup: ({groups, prepareRecordsOnly}: HandleGroupArgs) => Promise<GroupModel[]>;
    handleGroupsTeam: ({groupsTeams, prepareRecordsOnly}: HandleGroupsTeamArgs) => Promise<GroupsTeamModel[]>;
    handleGroupsChannel: ({groupsChannels, prepareRecordsOnly}: HandleGroupsChannelArgs) => Promise<GroupsChannelModel[]>;
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
            fieldName: 'group_id',
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

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groups, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            transformer: transformGroupRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUP,
        });
    };

    /**
     * handleGroupsTeam: Handler responsible for the Create/Update operations occurring on the GROUPS_TEAM table from the 'Server' schema
     * @param {HandleGroupsTeamArgs} groupsTeamsArgs
     * @param {GroupsTeam[]} groupsTeamsArgs.groupsTeams
     * @param {boolean} groupsTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupsTeamModel[]>}
     */
    handleGroupsTeam = ({groupsTeams, prepareRecordsOnly = true}: HandleGroupsTeamArgs): Promise<GroupsTeamModel[]> => {
        if (!groupsTeams.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsTeam method',
            );
        }

        const createOrUpdateRawValues = groupsTeams.filter((gt, index, self) => (
            index === self.findIndex((item) => item.team_id === gt.team_id && item.group_id === gt.group_id)));

        return this.handleRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsTeamEqualToRaw,
            transformer: transformGroupsTeamRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUPS_TEAM,
        });
    };

    /**
     * handleGroupsChannel: Handler responsible for the Create/Update operations occurring on the GROUPS_CHANNEL table from the 'Server' schema
     * @param {HandleGroupsChannelArgs} groupsChannelsArgs
     * @param {GroupsChannel[]} groupsChannelsArgs.groupsChannels
     * @param {boolean} groupsChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupsChannelModel[]>}
     */
    handleGroupsChannel = ({groupsChannels, prepareRecordsOnly = true}: HandleGroupsChannelArgs): Promise<GroupsChannelModel[]> => {
        if (!groupsChannels.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsTeam method',
            );
        }

        const createOrUpdateRawValues = groupsChannels.filter((gc, index, self) => (
            index === self.findIndex((item) => item.channel_id === gc.channel_id && item.group_id === gc.group_id)));

        return this.handleRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsChannelEqualToRaw,
            transformer: transformGroupsChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: GROUPS_CHANNEL,
        });
    };
};

export default GroupHandler;
