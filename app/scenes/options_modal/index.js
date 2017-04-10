// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {closeModal} from 'app/actions/navigation';

import navigationSceneConnect from '../navigationSceneConnect';

import OptionsModal from './options_modal';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        requestClose: state.navigation.modal.requestClose
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeModal
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(OptionsModal);
