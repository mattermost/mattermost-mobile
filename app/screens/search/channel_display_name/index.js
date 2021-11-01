// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General} from '@mm-redux/constants';
import {makeGetChannel} from '@mm-redux/selectors/entities/channels';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getTeam, getTeamMemberships} from '@mm-redux/selectors/entities/teams';

import ChannelDisplayName from './channel_display_name';

// Exported for testing
export function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    return (state, ownProps) => {
        const post = getPost(state, ownProps.postId);
        const channel = post ? getChannel(state, {id: post.channel_id}) : null;
        let teamName = '';
        if (channel) {
            const isDMorGM = channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL;
            const memberships = getTeamMemberships(state);
            if (!isDMorGM && memberships && Object.values(memberships).length > 1) {
                teamName = getTeam(state, channel.team_id)?.display_name;
            }
        }

        return {
            displayName: channel ? channel.display_name : '',
            theme: getTheme(state),
            teamName,
        };
    };
}

export default connect(makeMapStateToProps)(ChannelDisplayName);
