// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleCreateChannel} from 'app/actions/views/create_channel';
import {getDimensions} from 'app/selectors/device';

import CreateChannel from './create_channel';

function mapStateToProps(state) {
    const {deviceWidth, deviceHeight} = getDimensions(state);

    return {
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
