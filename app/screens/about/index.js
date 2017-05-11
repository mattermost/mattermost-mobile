// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import About from './about';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;

    return {
        config,
        license,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(About);
