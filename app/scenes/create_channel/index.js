// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack, closeModal} from 'app/actions/navigation';
import {handleCreateChannel} from 'app/actions/views/create_channel';

import {getTheme} from 'app/selectors/preferences';

import CreateChannel from './create_channel';

function mapStateToProps(state, ownProps) {
    const {createChannel: createChannelRequest} = state.requests.channels;

    return {
        ...ownProps,
        createChannelRequest,
        channelType: ownProps.channelType,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack,
            closeModal,
            handleCreateChannel
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(CreateChannel);
