// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goToLogin, goToSaml} from 'app/actions/navigation';

import LoginOptions from './login_options';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;
    return {
        config,
        license
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToLogin,
            goToSaml
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(LoginOptions);
