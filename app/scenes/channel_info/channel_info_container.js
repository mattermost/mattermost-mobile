// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getChannelStats} from 'service/actions/channels';
import {getCurrentChannel, getCurrentChannelStats, getChannelsByCategory} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getUser} from 'service/selectors/entities/users';

import ChannelInfo from './channel_info';

function mapStateToProps(state, ownProps) {
    const currentChannel = getCurrentChannel(state);
    const currentChannelCreator = getUser(state, currentChannel.creator_id);
    const currentChannelCreatorName = currentChannelCreator && currentChannelCreator.username;
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;
    const favoriteChannels = getChannelsByCategory(state).favoriteChannels.map((f) => f.id);
    const isFavorite = favoriteChannels.indexOf(currentChannel.id) > -1;

    return {
        ...ownProps,
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        isFavorite,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
