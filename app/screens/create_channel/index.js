// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleCreateChannel} from 'app/actions/views/create_channel';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getDimensions} from 'app/selectors/device';

import CreateChannel from './create_channel';

function mapStateToProps(state) {
    const {createChannel: createChannelRequest} = state.requests.channels;
    const {deviceWidth, deviceHeight} = getDimensions(state);

    return {
        createChannelRequest,
        theme: getTheme(state),
        deviceWidth,
        deviceHeight,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleCreateChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateChannel);
