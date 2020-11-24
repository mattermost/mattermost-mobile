// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import ChannelLoader from './channel_loader';

function mapStateToProps(state, ownProps) {
    const channelIsLoading = ownProps.hasOwnProperty('channelIsLoading') ? ownProps.channelIsLoading : state.views.channel.loading;

    return {
        channelIsLoading,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelLoader);
