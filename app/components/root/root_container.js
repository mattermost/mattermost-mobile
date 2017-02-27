// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import Config from 'assets/config.json';

import {loadConfigAndLicense} from 'app/actions/views/root';
import {setAppState} from 'service/actions/general';
import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from 'service/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    const users = state.entities.users;
    const currentUserId = users.currentId;

    let locale = Config.DefaultLocale;
    if (currentUserId && users.profiles[currentUserId]) {
        locale = users.profiles[currentUserId].locale;
    }

    return {
        ...ownProps,
        locale
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadConfigAndLicense,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
            setAppState
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
