// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import LoginOptions from './login_options';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;
    return {
        config,
        license,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(LoginOptions);
