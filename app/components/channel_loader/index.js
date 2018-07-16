// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {markChannelAsRead, markChannelAsViewed} from 'mattermost-redux/actions/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleSelectChannel} from 'app/actions/views/channel';

import ChannelLoader from './channel_loader';

function mapStateToProps(state, ownProps) {
    return {
        channelIsLoading: ownProps.channelIsLoading || state.views.channel.loading,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            markChannelAsRead,
            markChannelAsViewed,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelLoader);
