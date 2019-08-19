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
import {getUserIdFromChannelName, isChannelMuted} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';
import {isLandscape} from 'app/selectors/device';
import {getDraftForChannel} from 'app/selectors/views';
import {isGuest as isGuestUser} from 'app/utils/users';

import ChannelItem from './channel_item';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();

    return (state, ownProps) => {
        const channel = ownProps.channel || getChannel(state, {id: ownProps.channelId});
        const member = getMyChannelMember(state, channel.id);
        const currentUserId = getCurrentUserId(state);
        const channelDraft = getDraftForChannel(state, channel.id);

        let displayName = channel.display_name;
        let isBot = false;
        let isGuest = false;

        if (channel.type === General.DM_CHANNEL) {
            if (ownProps.isSearchResult) {
                isBot = Boolean(channel.isBot);
            } else {
                const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                const teammate = getUser(state, teammateId);
                const teammateNameDisplay = getTeammateNameDisplaySetting(state);
                displayName = displayUsername(teammate, teammateNameDisplay, false);
                if (teammate && teammate.is_bot) {
                    isBot = true;
                }
                isGuest = isGuestUser(teammate);
            }
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
            channel,
            currentChannelId,
            displayName,
            isChannelMuted: isChannelMuted(member),
            currentUserId,
            hasDraft: Boolean(channelDraft.draft.trim() || channelDraft.files.length),
            mentions: member ? member.mention_count : 0,
            shouldHideChannel,
            showUnreadForMsgs,
            theme: getTheme(state),
            unreadMsgs,
            isBot,
            isLandscape: isLandscape(state),
            isGuest,
        };
    };
}

export default connect(makeMapStateToProps)(ChannelItem);
