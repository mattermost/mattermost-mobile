// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {
    getCurrentChannelId,
    makeGetChannel,
    getMyChannelMember,
    shouldHideDefaultChannel,
} from 'mattermost-redux/selectors/entities/channels';
import {getTheme, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';
import {isChannelMuted} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ChannelItem from './channel_item';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();

    return (state, ownProps) => {
        const channel = ownProps.channel || getChannel(state, {id: ownProps.channelId});
        const member = getMyChannelMember(state, ownProps.channelId);
        const currentUserId = getCurrentUserId(state);

        let isMyUser = false;
        let teammateDeletedAt = 0;
        let displayName = channel.display_name;
        if (channel.type === General.DM_CHANNEL && channel.teammate_id) {
            isMyUser = channel.teammate_id === currentUserId;
            const teammate = getUser(state, channel.teammate_id);
            if (teammate && teammate.delete_at) {
                teammateDeletedAt = teammate.delete_at;
            }
            const teammateNameDisplay = getTeammateNameDisplaySetting(state);
            displayName = displayUsername(teammate, teammateNameDisplay, false);
        }

        const currentChannelId = getCurrentChannelId(state);
        const isActive = ownProps.channelId === currentChannelId;

        let shouldHideChannel = false;
        if (
            channel.name === General.DEFAULT_CHANNEL &&
            !isActive &&
            !ownProps.isFavorite &&
            !ownProps.isSearchResult &&
            shouldHideDefaultChannel(state, channel)
        ) {
            shouldHideChannel = true;
        }

        let unreadMsgs = 0;
        if (member && channel) {
            unreadMsgs = Math.max(channel.total_msg_count - member.msg_count, 0);
        }

        let showUnreadForMsgs = true;
        if (member && member.notify_props) {
            showUnreadForMsgs = member.notify_props.mark_unread !== General.MENTION;
        }
        return {
            currentChannelId,
            displayName,
            fake: channel.fake,
            isChannelMuted: isChannelMuted(member),
            isMyUser,
            mentions: member ? member.mention_count : 0,
            shouldHideChannel,
            showUnreadForMsgs,
            status: channel.status,
            teammateDeletedAt,
            theme: getTheme(state),
            type: channel.type,
            unreadMsgs,
            isArchived: channel.delete_at > 0,
        };
    };
}

export default connect(makeMapStateToProps)(ChannelItem);
