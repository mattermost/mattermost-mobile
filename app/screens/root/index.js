// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadMe} from 'mattermost-redux/actions/users';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import Root from './root';

function mapStateToProps(state) {
    return {
        currentUser: getCurrentUser(state),
        credentials: state.entities.general.credentials,
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
