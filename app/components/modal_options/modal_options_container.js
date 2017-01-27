// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closeModal} from 'app/actions/views/modal_options';
import ModalOptions from './modal_options';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        ...state.views.modalOptions
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeModal
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalOptions);
