// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadMe} from 'mattermost-redux/actions/users';

import {getTheme} from 'app/selectors/preferences';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        credentials: state.entities.general.credentials,
        loginRequest: state.requests.users.login,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadMe
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
