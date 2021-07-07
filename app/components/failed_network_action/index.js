// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import FailedNetworkAction from './failed_network_action';

import {isLandscape} from 'app/selectors/device';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(FailedNetworkAction);
