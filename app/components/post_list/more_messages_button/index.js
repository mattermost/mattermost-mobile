// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {START_OF_NEW_MESSAGES} from '@mm-redux/utils/post_list';

import MoreMessagesButton from './more_messages_button';

function mapStateToProps(state, ownProps) {
    const {channelId, postIds} = ownProps;
    let unreadCount = state.views.channel.unreadMessageCount[channelId] || 0;
    if (unreadCount) {
        const newMessagesIndex = postIds.indexOf(START_OF_NEW_MESSAGES);
        for (let i = 0; i < newMessagesIndex; i++) {
            if (postIds[i].includes('-')) {
                unreadCount += 1;
            }
        }
    }

    return {
        unreadCount,
    };
}

export default connect(mapStateToProps)(MoreMessagesButton);
