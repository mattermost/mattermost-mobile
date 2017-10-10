// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getStatusBarHeight} from 'app/selectors/device';

import KeyboardLayout from './keyboard_layout';

function mapStateToProps(state) {
    return {
        statusBarHeight: getStatusBarHeight(state)
    };
}

export default connect(mapStateToProps)(KeyboardLayout);
