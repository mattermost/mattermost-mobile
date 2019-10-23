// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import options from 'app/store/realm_options';

import SwitchTeamsButton from './switch_teams_button';

function getChannelDrawerBadgeCount(currentTeamId, teamMemberships) {
    let mentionCount = 0;
    let messageCount = 0;
    teamMemberships.forEach((m) => {
        if (m.teams[0].id !== currentTeamId) {
            mentionCount += (m.mentionCount || 0);
            messageCount += (m.msgCount || 0);
        }
    });

    let badgeCount = 0;
    if (mentionCount) {
        badgeCount = mentionCount;
    } else if (messageCount) {
        badgeCount = -1;
    }

    return badgeCount;
}

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const members = realm.objects('TeamMember').filtered('deleteAt = 0 AND teams.deleteAt = 0 AND user.id = $0', general.currentUserId);

    return [members];
}

function mapQueriesToProps([members], ownProps) {
    return {
        mentionCount: getChannelDrawerBadgeCount(ownProps.currentTeamId, members),
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(SwitchTeamsButton);
