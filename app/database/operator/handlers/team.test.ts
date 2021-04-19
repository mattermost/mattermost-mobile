// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DataOperator} from '@database/operator';
import {
    isRecordMyTeamEqualToRaw,
    isRecordSlashCommandEqualToRaw,
    isRecordTeamChannelHistoryEqualToRaw,
    isRecordTeamEqualToRaw,
    isRecordTeamMembershipEqualToRaw,
    isRecordTeamSearchHistoryEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareMyTeamRecord,
    prepareSlashCommandRecord,
    prepareTeamChannelHistoryRecord,
    prepareTeamMembershipRecord,
    prepareTeamRecord,
    prepareTeamSearchHistoryRecord,
} from '@database/operator/prepareRecords/team';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Operator: Team Handlers tests ***', () => {
    it('=> HandleTeam: should write to TEAM entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleTeam({
            teams: [
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
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            rawValues: [
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
            ],
            tableName: 'Team',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamEqualToRaw,
            operator: prepareTeamRecord,
        });
    });

    it('=> HandleTeamMemberships: should write to TEAM_MEMBERSHIP entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleTeamMemberships({
            teamMemberships: [
                {
                    team_id: 'a',
                    user_id: 'ab',
                    roles: '3ngdqe1e7tfcbmam4qgnxp91bw',
                    delete_at: 0,
                    scheme_guest: false,
                    scheme_user: true,
                    scheme_admin: false,
                    explicit_roles: '',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            rawValues: [
                {
                    team_id: 'a',
                    user_id: 'ab',
                    roles: '3ngdqe1e7tfcbmam4qgnxp91bw',
                    delete_at: 0,
                    scheme_guest: false,
                    scheme_user: true,
                    scheme_admin: false,
                    explicit_roles: '',
                },
            ],
            tableName: 'TeamMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamMembershipEqualToRaw,
            operator: prepareTeamMembershipRecord,
        });
    });

    it('=> HandleMyTeam: should write to MY_TEAM entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleMyTeam({
            myTeams: [
                {
                    team_id: 'teamA',
                    roles: 'roleA, roleB, roleC',
                    is_unread: true,
                    mentions_count: 3,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'team_id',
            rawValues: [
                {
                    team_id: 'teamA',
                    roles: 'roleA, roleB, roleC',
                    is_unread: true,
                    mentions_count: 3,
                },
            ],
            tableName: 'MyTeam',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyTeamEqualToRaw,
            operator: prepareMyTeamRecord,
        });
    });

    it('=> HandleTeamChannelHistory: should write to TEAM_CHANNEL_HISTORY entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleTeamChannelHistory({
            teamChannelHistories: [
                {
                    team_id: 'a',
                    channel_ids: ['ca', 'cb'],
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'team_id',
            rawValues: [{team_id: 'a', channel_ids: ['ca', 'cb']}],
            tableName: 'TeamChannelHistory',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamChannelHistoryEqualToRaw,
            operator: prepareTeamChannelHistoryRecord,
        });
    });

    it('=> HandleTeamSearchHistory: should write to TEAM_SEARCH_HISTORY entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleTeamSearchHistory({
            teamSearchHistories: [
                {
                    team_id: 'a',
                    term: 'termA',
                    display_term: 'termA',
                    created_at: 1445538153952,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'team_id',
            rawValues: [
                {
                    team_id: 'a',
                    term: 'termA',
                    display_term: 'termA',
                    created_at: 1445538153952,
                },
            ],
            tableName: 'TeamSearchHistory',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordTeamSearchHistoryEqualToRaw,
            operator: prepareTeamSearchHistoryRecord,
        });
    });

    it('=> HandleSlashCommand: should write to SLASH_COMMAND entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'team_handler', setActive: true});

        await DataOperator.handleSlashCommand({
            slashCommands: [
                {
                    id: 'command_1',
                    auto_complete: true,
                    auto_complete_desc: 'mock_command',
                    auto_complete_hint: 'hint',
                    create_at: 1445538153952,
                    creator_id: 'creator_id',
                    delete_at: 1445538153952,
                    description: 'description',
                    display_name: 'display_name',
                    icon_url: 'display_name',
                    method: 'get',
                    team_id: 'teamA',
                    token: 'token',
                    trigger: 'trigger',
                    update_at: 1445538153953,
                    url: 'url',
                    username: 'userA',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            rawValues: [
                {
                    id: 'command_1',
                    auto_complete: true,
                    auto_complete_desc: 'mock_command',
                    auto_complete_hint: 'hint',
                    create_at: 1445538153952,
                    creator_id: 'creator_id',
                    delete_at: 1445538153952,
                    description: 'description',
                    display_name: 'display_name',
                    icon_url: 'display_name',
                    method: 'get',
                    team_id: 'teamA',
                    token: 'token',
                    trigger: 'trigger',
                    update_at: 1445538153953,
                    url: 'url',
                    username: 'userA',
                },
            ],
            tableName: 'SlashCommand',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordSlashCommandEqualToRaw,
            operator: prepareSlashCommandRecord,
        });
    });
});
