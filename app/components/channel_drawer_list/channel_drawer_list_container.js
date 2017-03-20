// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    goToModalAccountSettings,
    goToCreateChannel,
    requestCloseModal,
    showMoreChannelsModal,
    showDirectMessagesModal,
    showOptionsModal
} from 'app/actions/navigation';

import {
    closeDMChannel,
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
            closeDMChannel,
            goToCreateChannel,
            goToModalAccountSettings,
            leaveChannel,
            markFavorite,
            unmarkFavorite,
            showOptionsModal,
            showDirectMessagesModal,
            showMoreChannelsModal,
            closeOptionsModal: requestCloseModal
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawerList);
