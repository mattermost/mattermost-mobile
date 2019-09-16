// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelDrawerButton from './channel_drawer_button';

const getBadgeCount = createSelector(
    getCurrentTeamId,
    getTeamMemberships,
    (state, mentionCount) => mentionCount,
    (state, _, messageCount) => messageCount,
    (currentTeamId, myTeamMembers, mentionCount, messageCount) => {
        let mentions = mentionCount;
        let messages = messageCount;

        const members = Object.values(myTeamMembers).filter((m) => m.team_id !== currentTeamId);
        members.forEach((m) => {
            mentions += (m.mention_count || 0);
            messages += (m.msg_count || 0);
        });

        let badgeCount = 0;
        if (mentions) {
            badgeCount = mentions;
        } else if (messages) {
            badgeCount = -1;
        }

        return badgeCount;
    }
);

function mapStateToProps(state) {
    const {mentionCount, messageCount} = getUnreadsInCurrentTeam(state);

    return {
        badgeCount: getBadgeCount(state, mentionCount, messageCount),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
