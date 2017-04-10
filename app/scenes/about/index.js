// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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

export default navigationSceneConnect(mapStateToProps)(About);
