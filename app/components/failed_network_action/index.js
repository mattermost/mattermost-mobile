// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isLandscape} from 'app/selectors/device';
import {connect} from 'react-redux';

import FailedNetworkAction from './failed_network_action';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(FailedNetworkAction);
