// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDimensions} from 'app/selectors/device';
import {connect} from 'react-redux';

import OptionsModal from './options_modal';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
    };
}

export default connect(mapStateToProps)(OptionsModal);
