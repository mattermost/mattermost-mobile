// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import LoginOptions from './login_options';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    return {
        ...ownProps,
        config,
        license,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(LoginOptions);
