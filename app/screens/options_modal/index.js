// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getDimensions} from 'app/selectors/device';

import OptionsModal from './options_modal';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
    };
}

export default connect(mapStateToProps)(OptionsModal);
