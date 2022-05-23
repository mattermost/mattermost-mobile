// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    transformGroupChannelRecord,
    transformGroupMembershipRecord,
    transformGroupRecord,
    transformGroupTeamRecord,
} from '@database/operator/server_data_operator/transformers/group';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {
    HandleGroupChannelArgs,
    HandleGroupArgs,
    HandleGroupTeamArgs,
    HandleGroupMembershipArgs,
} from '@typings/database/database';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupChannelModel from '@typings/database/models/servers/group_channel';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupTeamModel from '@typings/database/models/servers/group_team';

const {
    GROUP,
    GROUP_CHANNEL,
    GROUP_TEAM,
    GROUP_MEMBERSHIP,
} = MM_TABLES.SERVER;

export interface GroupHandlerMix {
    handleGroups: ({groups, prepareRecordsOnly}: HandleGroupArgs) => Promise<GroupModel[]>;
    handleGroupChannels: ({groupChannels, prepareRecordsOnly}: HandleGroupChannelArgs) => Promise<GroupChannelModel[]>;
    handleGroupMemberships: ({groupMemberships, prepareRecordsOnly}: HandleGroupMembershipArgs) => Promise<GroupMembershipModel[]>;
    handleGroupTeams: ({groupTeams, prepareRecordsOnly}: HandleGroupTeamArgs) => Promise<GroupTeamModel[]>;
}

const GroupHandler = (superclass: any) => class extends superclass {
    /**
     * handleGroups: Handler responsible for the Create/Update operations occurring on the Group table from the 'Server' schema
     * @param {HandleGroupArgs} groupsArgs
     * @param {Group[]} groupsArgs.groups
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupModel[]>}
     */
    handleGroups = async ({groups, prepareRecordsOnly = true}: HandleGroupArgs): Promise<GroupModel[]> => {
        if (!groups?.length) {
            // eslint-disable-next-line no-console
            console.warn(
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
        });
    };

    /**
     * handleGroupChannels: Handler responsible for the Create/Update operations occurring on the GroupChannel table from the 'Server' schema
     * @param {HandleGroupChannelArgs} groupsArgs
     * @param {GroupChannel[]} groupsArgs.groupChannels
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupChannelModel[]>}
     */
    handleGroupChannels = async ({groupChannels, prepareRecordsOnly = true}: HandleGroupChannelArgs): Promise<GroupModel[]> => {
        if (!groupChannels?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "groupChannels" array has been passed to the handleGroups method',
            );

            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupChannels, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupChannelRecord,
            createOrUpdateRawValues,
            tableName: GROUP_CHANNEL,
            prepareRecordsOnly,
        });
    };

    /**
     * handleGroupTeams: Handler responsible for the Create/Update operations occurring on the GroupTeam table from the 'Server' schema
     * @param {HandleGroupTeamArgs} groupsArgs
     * @param {GroupTeam[]} groupsArgs.groupTeams
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupTeamModel[]>}
     */
    handleGroupTeams = async ({groupTeams, prepareRecordsOnly = true}: HandleGroupTeamArgs): Promise<GroupModel[]> => {
        if (!groupTeams?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "groupTeams" array has been passed to the handleGroups method',
            );

            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupTeams, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupTeamRecord,
            createOrUpdateRawValues,
            tableName: GROUP_TEAM,
            prepareRecordsOnly,
        });
    };

    /**
     * handleGroupMemberships: Handler responsible for the Create/Update operations occurring on the GroupMembership table from the 'Server' schema
     * @param {HandleGroupMembershipArgs} groupsArgs
     * @param {GroupMembership[]} groupsArgs.groupMemberships
     * @param {boolean} groupsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<GroupMembershipModel[]>}
     */
    handleGroupMemberships = async ({groupMemberships, prepareRecordsOnly = true}: HandleGroupMembershipArgs): Promise<GroupMembershipModel[]> => {
        if (!groupMemberships?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "groupMemberships" array has been passed to the handleGroups method',
            );

            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: groupMemberships, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformGroupMembershipRecord,
            createOrUpdateRawValues,
            tableName: GROUP_MEMBERSHIP,
            prepareRecordsOnly,
        });
    };
};

export default GroupHandler;
