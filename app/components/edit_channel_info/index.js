// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    dismissModal,
    popTopScreen,
} from 'app/actions/navigation';
import {isLandscape} from 'app/selectors/device';
import EditChannelInfo from './edit_channel_info';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissModal,
            popTopScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditChannelInfo);
