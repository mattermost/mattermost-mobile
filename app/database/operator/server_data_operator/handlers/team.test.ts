// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    buildTeamMembershipKey,
    buildTeamSearchHistoryKey,
} from '@database/operator/server_data_operator/comparators';
import {
    transformMyTeamRecord,
    transformTeamChannelHistoryRecord,
    transformTeamMembershipRecord,
    transformTeamRecord,
    transformTeamSearchHistoryRecord,
} from '@database/operator/server_data_operator/transformers/team';

import type ServerDataOperator from '..';

describe('*** Operator: Team Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleTeam: should write to the TEAM table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teams: Team[] = [
            {
                id: 'rcgiyftm7jyrxnmdfdfa1osd8zswby',
                create_at: 1445538153952,
                update_at: 1588876392150,
                delete_at: 0,
                display_name: 'Contributors',
                name: 'core',
                description: '',
                email: '',
                type: 'O',
                company_name: '',
                allowed_domains: '',
                invite_id: 'codoy5s743rq5mk18i7u5dfdfksz7e',
                allow_open_invite: true,
                last_team_icon_update: 1525181587639,
                scheme_id: 'hbwgrncq1pfcdkpotzidfdmarn95o',
                group_constrained: null,
            },
        ];

        await operator.handleTeam({
            teams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: teams,
            tableName: 'Team',
            prepareRecordsOnly: false,
            transformer: transformTeamRecord,
        }, 'handleTeam');
    });

    it('=> HandleTeamMemberships: should write to the TEAM_MEMBERSHIP table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamMemberships: TeamMembership[] = [
            {
                team_id: 'a',
                user_id: 'ab',
                roles: '',
                delete_at: 0,
                msg_count: 0,
                mention_count: 0,
                scheme_user: true,
                scheme_admin: false,
            },
        ];

        await operator.handleTeamMemberships({
            teamMemberships,
            prepareRecordsOnly: false,
        });

        const memberships = teamMemberships.map((m) => ({
            ...m,
            id: `${m.team_id}-${m.user_id}`,
        }));

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            createOrUpdateRawValues: memberships,
            tableName: 'TeamMembership',
            prepareRecordsOnly: false,
            buildKeyRecordBy: buildTeamMembershipKey,
            transformer: transformTeamMembershipRecord,
        }, 'handleTeamMemberships');
    });

    it('=> HandleMyTeam: should write to the MY_TEAM table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const myTeams = [
            {
                id: 'teamA',
                roles: 'roleA, roleB, roleC',
            },
        ];

        await operator.handleMyTeam({
            myTeams,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: myTeams,
            tableName: 'MyTeam',
            prepareRecordsOnly: false,
            transformer: transformMyTeamRecord,
        }, 'handleMyTeam');
    });

    it('=> HandleTeamChannelHistory: should write to the TEAM_CHANNEL_HISTORY table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamChannelHistories = [
            {
                id: 'a',
                channel_ids: ['ca', 'cb'],
            },
        ];

        await operator.handleTeamChannelHistory({
            teamChannelHistories,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: teamChannelHistories,
            tableName: 'TeamChannelHistory',
            prepareRecordsOnly: false,
            transformer: transformTeamChannelHistoryRecord,
        }, 'handleTeamChannelHistory');
    });

    it('=> HandleTeamSearchHistory: should write to the TEAM_SEARCH_HISTORY table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const teamSearchHistories: TeamSearchHistory[] = [
            {
                team_id: 'a',
                term: 'termA',
                display_term: 'termA',
                created_at: 1445538153952,
            },
        ];

        await operator.handleTeamSearchHistory({
            teamSearchHistories,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'team_id',
            createOrUpdateRawValues: teamSearchHistories,
            tableName: 'TeamSearchHistory',
            prepareRecordsOnly: false,
            buildKeyRecordBy: buildTeamSearchHistoryKey,
            transformer: transformTeamSearchHistoryRecord,
        }, 'handleTeamSearchHistory');
    });
});
