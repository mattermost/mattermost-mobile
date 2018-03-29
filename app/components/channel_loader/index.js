// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelLoader from './channel_loader';

function mapStateToProps(state) {
    const {deviceWidth} = state.device.dimension;
    return {
        channelIsLoading: state.views.channel.loading,
        deviceWidth,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelLoader);
