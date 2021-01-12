// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {handleCreateChannel} from 'app/actions/views/create_channel';

import CreateChannel from './create_channel';

function mapStateToProps(state) {
    const {createChannel: createChannelRequest} = state.requests.channels;

    return {
        createChannelRequest,
        theme: getTheme(state),
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
