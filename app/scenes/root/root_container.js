// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadStorage, removeStorage} from 'app/actions/storage';
import {goToSelectServer, setStoreFromLocalData} from 'app/actions/views/root';
import {goToSelectTeam} from 'app/actions/navigation';
import {resetLogout} from 'service/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        credentials: state.entities.general.credentials,
        logoutRequest: state.requests.users.logout,
        loginRequest: state.requests.users.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToSelectServer,
            goToSelectTeam,
            loadStorage,
            removeStorage,
            setStoreFromLocalData,
            resetLogout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
