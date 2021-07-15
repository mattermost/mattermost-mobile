// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ServerDataOperator from '@database/operator/server_data_operator';

export const prepareMyTeams = (operator: ServerDataOperator, teams: Team[], memberships: TeamMembership[], unreads: TeamUnread[]) => {
    try {
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams});
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships: memberships});
        const myTeams: MyTeam[] = unreads.map((unread) => {
            const matchingTeam = memberships.find((team) => team.team_id === unread.team_id);
            return {team_id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
        });
        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
        });

        return [teamRecords, teamMembershipRecords, myTeamRecords];
    } catch {
        return undefined;
    }
};
