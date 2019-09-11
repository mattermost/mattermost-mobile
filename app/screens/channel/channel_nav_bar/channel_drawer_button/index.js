// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelDrawerButton from './channel_drawer_button';

function mapStateToProps(state) {
    const currentTeamId = getCurrentTeamId(state);
    const {mentionCount, messageCount} = getUnreadsInCurrentTeam(state);
    const myTeamMembers = getTeamMemberships(state);

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

    return {
        badgeCount,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelDrawerButton);
