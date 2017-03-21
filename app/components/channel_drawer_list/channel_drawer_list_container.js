// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    goToCreateChannel,
    openSettingsModal,
    requestCloseModal,
    showMoreChannelsModal,
    showDirectMessagesModal,
    showOptionsModal
} from 'app/actions/navigation';

import {
    closeDirectChannel,
    leaveChannel,
    markFavorite,
    unmarkFavorite
} from 'app/actions/views/channel';

import ChannelDrawerList from './channel_drawer_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDirectChannel,
            goToCreateChannel,
            leaveChannel,
            markFavorite,
            openSettingsModal,
            unmarkFavorite,
            showOptionsModal,
            showDirectMessagesModal,
            showMoreChannelsModal,
            closeOptionsModal: requestCloseModal
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawerList);
