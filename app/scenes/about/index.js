// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {goBack} from 'app/actions/navigation';

import {getTheme} from 'app/selectors/preferences';
import navigationSceneConnect from 'app/scenes/navigationSceneConnect';

import About from './about';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;

    return {
        config,
        license,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(About);
