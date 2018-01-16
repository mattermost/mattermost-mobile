// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannelId, makeGetChannel, getMyChannelMember} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';

import ChannelItem from './channel_item';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();

    return (state, ownProps) => {
        const channel = ownProps.channel || getChannel(state, {id: ownProps.channelId});
        let member;
        if (ownProps.isUnread) {
            member = getMyChannelMember(state, ownProps.channelId);
        }

        let teammate = null;
        if (channel.teammate_id) {
            teammate = getUser(state, channel.teammate_id);
        }

        return {
            currentUserId: getCurrentUserId(state),
            currentChannelId: getCurrentChannelId(state),
            channelTeammateId: teammate && teammate.id,
            displayName: channel.display_name,
            fake: channel.fake,
            mentions: member ? member.mention_count : 0,
            status: channel.status,
            theme: getTheme(state),
            type: channel.type
        };
    };
}

export default connect(makeMapStateToProps)(ChannelItem);
