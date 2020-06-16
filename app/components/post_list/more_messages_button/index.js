// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {START_OF_NEW_MESSAGES, nonMessageCount} from '@mm-redux/utils/post_list';

import MoreMessagesButton from './more_messages_button';

function mapStateToProps(state, ownProps) {
    const {channelId, postIds} = ownProps;
    let unreadCount = state.views.channel.unreadMessageCount[channelId] || 0;

    // The channel unread count in state does not account for the addition of
    // non-message posts like date lines, combined user activity, etc., so
    // we include them up to the START_OF_NEW_MESSAGES.
    if (unreadCount) {
        const newMessagesIndex = postIds.indexOf(START_OF_NEW_MESSAGES);
        unreadCount += nonMessageCount(postIds.slice(0, newMessagesIndex));
    }

    return {
        unreadCount,
    };
}

export default connect(mapStateToProps)(MoreMessagesButton);
