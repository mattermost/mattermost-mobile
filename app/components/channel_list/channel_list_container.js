// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {showOptionsModal, closeModal} from 'app/actions/navigation';
import {closeDMChannel, leaveChannel, markFavorite, unmarkFavorite} from 'app/actions/views/channel';

import {viewChannel} from 'service/actions/channels';
import ChannelList from './channel_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            viewChannel,
            closeDMChannel,
            leaveChannel,
            markFavorite,
            unmarkFavorite,
            showOptionsModal,
            closeOptionsModal: closeModal
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelList);
