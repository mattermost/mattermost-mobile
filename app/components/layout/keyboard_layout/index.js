// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isLandscape} from 'app/selectors/device';
import {connect} from 'react-redux';

import KeyboardLayout from './keyboard_layout';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(KeyboardLayout);
