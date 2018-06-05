// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getStatusBarHeight} from 'app/selectors/device';

import KeyboardLayout from './keyboard_layout';

function mapStateToProps(state) {
    return {
        statusBarHeight: getStatusBarHeight(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(KeyboardLayout);
