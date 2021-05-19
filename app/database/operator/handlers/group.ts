// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordGroupEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordGroupsInChannelEqualToRaw,
    isRecordGroupsInTeamEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareGroupMembershipRecord,
    prepareGroupRecord,
    prepareGroupsInChannelRecord,
    prepareGroupsInTeamRecord,
} from '@database/operator/prepareRecords/group';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {
    HandleGroupArgs,
    HandleGroupMembershipArgs,
    HandleGroupsInChannelArgs,
    HandleGroupsInTeamArgs,
} from '@typings/database/database';
import Group from '@typings/database/group';
import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

const {
    GROUP,
    GROUPS_IN_CHANNEL,
    GROUPS_IN_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

export interface GroupHandlerMix {
    handleGroupMembership : ({groupMemberships, prepareRecordsOnly}: HandleGroupMembershipArgs) => GroupMembership[] | boolean,
    handleGroup : ({groups, prepareRecordsOnly}: HandleGroupArgs) => Group[] | boolean,
    handleGroupsInTeam : ({groupsInTeams, prepareRecordsOnly} : HandleGroupsInTeamArgs) => GroupsInTeam[] | boolean,
    handleGroupsInChannel : ({groupsInChannels, prepareRecordsOnly}: HandleGroupsInChannelArgs) => GroupsInChannel[] | boolean
}

const GroupHandler = (superclass: any) => class extends superclass {
    /**
     * handleGroupMembership: Handler responsible for the Create/Update operations occurring on the GROUP_MEMBERSHIP entity from the 'Server' schema
     * @param {HandleGroupMembershipArgs} groupMembershipsArgs
     * @param {RawGroupMembership[]} groupMembershipsArgs.groupMemberships
     * @param {boolean} groupMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {GroupMembership[]}
     */
    handleGroupMembership = async ({groupMemberships, prepareRecordsOnly = true}: HandleGroupMembershipArgs) => {
        let records: GroupMembership[] = [];

        if (!groupMemberships.length) {
            throw new DataOperatorException(
                'An empty "groupMemberships" array has been passed to the handleGroupMembership method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: groupMemberships, key: 'group_id'});

        records = await this.handleEntityRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordGroupMembershipEqualToRaw,
            operator: prepareGroupMembershipRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: GROUP_MEMBERSHIP,
        });

        return records;
    };

    /**
     * handleGroup: Handler responsible for the Create/Update operations occurring on the GROUP entity from the 'Server' schema
     * @param {HandleGroupArgs} groupsArgs
     * @param {RawGroup[]} groupsArgs.groups
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Group[]}
     */
    handleGroup = async ({groups, prepareRecordsOnly = true}: HandleGroupArgs) => {
        let records: Group[] = [];

        if (!groups.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroup method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: groups, key: 'name'});

        records = await this.handleEntityRecords({
            fieldName: 'name',
            findMatchingRecordBy: isRecordGroupEqualToRaw,
            operator: prepareGroupRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: GROUP,
        });

        return records;
    };

    /**
     * handleGroupsInTeam: Handler responsible for the Create/Update operations occurring on the GROUPS_IN_TEAM entity from the 'Server' schema
     * @param {HandleGroupsInTeamArgs} groupsInTeamsArgs
     * @param {RawGroupsInTeam[]} groupsInTeamsArgs.groupsInTeams
     * @param {boolean} groupsInTeamsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {GroupsInTeam[]}
     */
    handleGroupsInTeam = async ({groupsInTeams, prepareRecordsOnly = true} : HandleGroupsInTeamArgs) => {
        let records: GroupsInTeam[] = [];

        if (!groupsInTeams.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsInTeam method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: groupsInTeams, key: 'group_id'});

        records = await this.handleEntityRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsInTeamEqualToRaw,
            operator: prepareGroupsInTeamRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: GROUPS_IN_TEAM,
        });

        return records;
    };

    /**
     * handleGroupsInChannel: Handler responsible for the Create/Update operations occurring on the GROUPS_IN_CHANNEL entity from the 'Server' schema
     * @param {HandleGroupsInChannelArgs} groupsInChannelsArgs
     * @param {RawGroupsInChannel[]} groupsInChannelsArgs.groupsInChannels
     * @param {boolean} groupsInChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {GroupsInChannel[]}
     */
    handleGroupsInChannel = async ({groupsInChannels, prepareRecordsOnly = true}: HandleGroupsInChannelArgs) => {
        let records: GroupsInChannel[] = [];

        if (!groupsInChannels.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroupsInTeam method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: groupsInChannels, key: 'channel_id'});

        records = await this.handleEntityRecords({
            fieldName: 'group_id',
            findMatchingRecordBy: isRecordGroupsInChannelEqualToRaw,
            operator: prepareGroupsInChannelRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: GROUPS_IN_CHANNEL,
        });

        return records;
    };
};

export default GroupHandler;
