// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
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

        const currentUserId = getCurrentUserId(state);
        let isMyUser = false;
        let teammateDeletedAt = 0;
        if (channel.type === General.DM_CHANNEL && channel.teammate_id) {
            isMyUser = channel.teammate_id === currentUserId;
            const teammate = getUser(state, channel.teammate_id);
            if (teammate && teammate.delete_at) {
                teammateDeletedAt = teammate.delete_at;
            }
        }

        return {
            currentChannelId: getCurrentChannelId(state),
            displayName: channel.display_name,
            fake: channel.fake,
            isMyUser,
            mentions: member ? member.mention_count : 0,
            status: channel.status,
            teammateDeletedAt,
            theme: getTheme(state),
            type: channel.type,
        };
    };
}

export default connect(makeMapStateToProps)(ChannelItem);
