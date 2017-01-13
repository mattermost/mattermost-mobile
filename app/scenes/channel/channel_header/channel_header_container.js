// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {Constants} from 'service/constants';
import {getMyPreferences, getTheme} from 'service/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'service/selectors/entities/users';
import {getUserIdFromChannelName} from 'service/utils/channel_utils';
import {displayUsername} from 'service/utils/user_utils';

import ChannelHeader from './channel_header';

function mapStateToProps(state, ownProps) {
    const currentChannel = ownProps.currentChannel;

    let displayName = '';
    if (currentChannel) {
        if (currentChannel.type === Constants.DM_CHANNEL) {
            const otherUser = getUser(state, getUserIdFromChannelName(getCurrentUserId(state), currentChannel));

            if (otherUser) {
                displayName = displayUsername(otherUser, getMyPreferences(state));
            }
        } else {
            displayName = currentChannel.display_name;
        }
    }

    return {
        ...ownProps,
        displayName,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelHeader);
