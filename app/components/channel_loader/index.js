// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getPostIdsInCurrentChannel} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelLoader from './channel_loader';

function mapStateToProps(state, ownProps) {
    return {
        channelIsLoading: ownProps.channelIsLoading || (state.views.channel.loading && !getPostIdsInCurrentChannel(state).length),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps, null)(ChannelLoader);
