// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import OptionsModal from './options_modal';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps
    };
}

export default connect(mapStateToProps)(OptionsModal);
