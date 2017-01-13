// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadStorage, removeStorage} from 'app/actions/storage';
import {goToSelectServer, setStoreFromLocalData} from 'app/actions/views/root';
import {goToSelectTeam, goToChannelView} from 'app/actions/navigation';
import * as teamActions from 'service/actions/teams';
import {resetLogout} from 'service/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        credentials: state.entities.general.credentials,
        logoutRequest: state.requests.users.logout,
        loginRequest: state.requests.users.login,
        currentTeamId: state.entities.teams.currentId,
        teams: state.entities.teams.teams
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...teamActions,
            goToChannelView,
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
