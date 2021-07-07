// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import KeyboardLayout from './keyboard_layout';

import {isLandscape} from 'app/selectors/device';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(KeyboardLayout);
