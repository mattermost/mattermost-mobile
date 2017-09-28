// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {getTheme} from 'app/selectors/preferences';

import ChannelLoader from './channel_loader';

function mapStateToProps(state, ownProps) {
    const {deviceWidth} = state.device.dimension;
    return {
        ...ownProps,
        channelIsLoading: state.views.channel.loading,
        deviceWidth,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelLoader);
