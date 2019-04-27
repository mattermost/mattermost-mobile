// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleSelectChannel, setChannelLoading} from 'app/actions/views/channel';

import ChannelLoader from './channel_loader';

function mapStateToProps(state, ownProps) {
    const channelIsLoading = ownProps.hasOwnProperty('channelIsLoading') ?
        ownProps.channelIsLoading :
        state.views.channel.loading;

    return {
        channelIsLoading,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            setChannelLoading,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelLoader);
