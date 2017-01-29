// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closeModal} from 'app/actions/views/options_modal';
import OptionsModal from './options_modal';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        ...state.views.optionsModal
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeModal
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(OptionsModal);
