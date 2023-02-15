// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {transformGroupChannelRecord, transformGroupMembershipRecord, transformGroupRecord, transformGroupTeamRecord} from '@database/operator/server_data_operator/transformers/group';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {queryGroupChannelForChannel, queryGroupMembershipForMember, queryGroupTeamForTeam} from '@queries/servers/group';
import {generateGroupAssociationId} from '@utils/groups';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type {HandleGroupArgs, HandleGroupChannelsForChannelArgs, HandleGroupMembershipForMemberArgs, HandleGroupTeamsForTeamArgs} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupChannelModel from '@typings/database/models/servers/group_channel';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupTeamModel from '@typings/database/models/servers/group_team';

const {GROUP, GROUP_CHANNEL, GROUP_MEMBERSHIP, GROUP_TEAM} = MM_TABLES.SERVER;

export interface GroupHandlerMix {
    handleGroups: ({groups, prepareRecordsOnly}: HandleGroupArgs) => Promise<GroupModel[]>;
    handleGroupChannelsForChannel: ({channelId, groups, prepareRecordsOnly}: HandleGroupChannelsForChannelArgs) => Promise<GroupChannelModel[]>;
    handleGroupMembershipsForMember: ({userId, groups, prepareRecordsOnly}: HandleGroupMembershipForMemberArgs) => Promise<GroupMembershipModel[]>;
    handleGroupTeamsForTeam: ({teamId, groups, prepareRecordsOnly}: HandleGroupTeamsForTeamArgs) => Promise<GroupTeamModel[]>;
}

const GroupHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass implements GroupHandlerMix {
    /**
      * handleGroups: Handler responsible for the Create/Update operations occurring on the Group table from the 'Server' schema
      *
      * @param {HandleGroupArgs}
      * @returns {Promise<GroupModel[]>}
      */
    handleGroups = async ({groups, prepareRecordsOnly = true}: HandleGroupArgs): Promise<GroupModel[]> => {
        if (!groups?.length) {
            logWarning(
                'An empty or undefined "groups" array has been passed to the handleGroups method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groups, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupRecord,
            createOrUpdateRawValues,
            tableName: GROUP,
            prepareRecordsOnly,
        }, 'handleGroups');
    };

    /**
     * handleGroupChannelsForChannel: Handler responsible for the Create/Update operations occurring on the GroupChannel table from the 'Server' schema
     *
     * @param {HandleGroupChannelsForChannelArgs}
     * @returns {Promise<GroupChannelModel[]>}
     */
    handleGroupChannelsForChannel = async ({channelId, groups, prepareRecordsOnly = true}: HandleGroupChannelsForChannelArgs): Promise<GroupChannelModel[]> => {
        // Get existing group channels
        const existingGroupChannels = await queryGroupChannelForChannel(this.database, channelId).fetch();

        let records: GroupChannelModel[] = [];
        let rawValues: GroupChannel[] = [];

        // Nothing to add or remove
        if (!groups?.length && !existingGroupChannels.length) {
            return records;
        } else if (!groups?.length && existingGroupChannels.length) { // No groups - remove all existing ones
            records = existingGroupChannels.map((gt) => gt.prepareDestroyPermanently());
        } else if (groups?.length && !existingGroupChannels.length) { // No existing groups - add all new ones
            rawValues = groups.map((g) => ({id: generateGroupAssociationId(g.id, channelId), channel_id: channelId, group_id: g.id}));
        } else if (groups?.length && existingGroupChannels.length) { // If both, we only want to save new ones and delete one's no longer in groups
            const groupsSet: {[key: string]: GroupChannel} = {};

            for (const g of groups) {
                groupsSet[g.id] = {id: generateGroupAssociationId(g.id, channelId), channel_id: channelId, group_id: g.id};
            }

            for (const gt of existingGroupChannels) {
                // Check if existingGroups overlaps with groups
                if (groupsSet[gt.groupId]) {
                    // If there is an existing group already, we don't need to add it
                    delete groupsSet[gt.groupId];
                } else {
                    // No group? Remove existing one
                    records.push(gt.prepareDestroyPermanently());
                }
            }

            rawValues.push(...Object.values(groupsSet));
        }

        records.push(...(await this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupChannelRecord,
            createOrUpdateRawValues: rawValues,
            tableName: GROUP_CHANNEL,
            prepareRecordsOnly: true,
        }, 'handleGroupChannelsForChannel')));

        // Batch update if there are records
        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handleGroupChannelsForChannel');
        }

        return records;
    };

    /**
     * handleGroupMembershipsForMember: Handler responsible for the Create/Update operations occurring on the GroupMembership table from the 'Server' schema
     *
     * @param {HandleGroupMembershipForMemberArgs}
     * @returns {Promise<GroupMembershipModel[]>}
     */
    handleGroupMembershipsForMember = async ({userId, groups, prepareRecordsOnly = true}: HandleGroupMembershipForMemberArgs): Promise<GroupMembershipModel[]> => {
        // Get existing group memberships
        const existingGroupMemberships = await queryGroupMembershipForMember(this.database, userId).fetch();

        let records: GroupMembershipModel[] = [];
        let rawValues: GroupMembership[] = [];

        // Nothing to add or remove
        if (!groups?.length && !existingGroupMemberships.length) {
            return records;
        } else if (!groups?.length && existingGroupMemberships.length) { // No groups - remove all existing ones
            records = existingGroupMemberships.map((gm) => gm.prepareDestroyPermanently());
        } else if (groups?.length && !existingGroupMemberships.length) { // No existing groups - add all new ones
            rawValues = groups.map((g) => ({id: generateGroupAssociationId(g.id, userId), user_id: userId, group_id: g.id}));
        } else if (groups?.length && existingGroupMemberships.length) { // If both, we only want to save new ones and delete one's no longer in groups
            const groupsSet: {[key: string]: GroupMembership} = {};

            for (const g of groups) {
                groupsSet[g.id] = {id: generateGroupAssociationId(g.id, userId), user_id: userId, group_id: g.id};
            }

            for (const gm of existingGroupMemberships) {
                // Check if existingGroups overlaps with groups
                if (groupsSet[gm.groupId]) {
                    // If there is an existing group already, we don't need to add it
                    delete groupsSet[gm.groupId];
                } else {
                    // No group? Remove existing one
                    records.push(gm.prepareDestroyPermanently());
                }
            }

            rawValues.push(...Object.values(groupsSet));
        }

        if (rawValues.length) {
            records.push(...(await this.handleRecords({
                fieldName: 'id',
                transformer: transformGroupMembershipRecord,
                createOrUpdateRawValues: rawValues,
                tableName: GROUP_MEMBERSHIP,
                prepareRecordsOnly: true,
            }, 'handleGroupMembershipsForMember')));
        }

        // Batch update if there are records
        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handleGroupMembershipsForMember');
        }

        return records;
    };

    /**
     * handleGroupTeamsForTeam: Handler responsible for the Create/Update operations occurring on the GroupTeam table from the 'Server' schema
     *
     * @param {HandleGroupTeamsForTeamArgs}
     * @returns {Promise<GroupTeamModel[]>}
     */
    handleGroupTeamsForTeam = async ({teamId, groups, prepareRecordsOnly = true}: HandleGroupTeamsForTeamArgs): Promise<GroupTeamModel[]> => {
        // Get existing group teams
        const existingGroupTeams = await queryGroupTeamForTeam(this.database, teamId).fetch();

        let records: GroupTeamModel[] = [];
        let rawValues: GroupTeam[] = [];

        // Nothing to add or remove
        if (!groups?.length && !existingGroupTeams.length) {
            return records;
        } else if (!groups?.length && existingGroupTeams.length) { // No groups - remove all existing ones
            records = existingGroupTeams.map((gt) => gt.prepareDestroyPermanently());
        } else if (groups?.length && !existingGroupTeams.length) { // No existing groups - add all new ones
            rawValues = groups.map((g) => ({id: generateGroupAssociationId(g.id, teamId), team_id: teamId, group_id: g.id}));
        } else if (groups?.length && existingGroupTeams.length) { // If both, we only want to save new ones and delete one's no longer in groups
            const groupsSet: {[key: string]: GroupTeam} = {};

            for (const g of groups) {
                groupsSet[g.id] = {id: generateGroupAssociationId(g.id, teamId), team_id: teamId, group_id: g.id};
            }

            for (const gt of existingGroupTeams) {
                // Check if existingGroups overlaps with groups
                if (groupsSet[gt.groupId]) {
                    // If there is an existing group already, we don't need to add it
                    delete groupsSet[gt.groupId];
                } else {
                    // No group? Remove existing one
                    records.push(gt.prepareDestroyPermanently());
                }
            }

            rawValues.push(...Object.values(groupsSet));
        }

        records.push(...(await this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupTeamRecord,
            createOrUpdateRawValues: rawValues,
            tableName: GROUP_TEAM,
            prepareRecordsOnly: true,
        }, 'handleGroupTeamsForTeam')));

        // Batch update if there are records
        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handleGroupTeamsForTeam');
        }

        return records;
    };
};

export default GroupHandler;
