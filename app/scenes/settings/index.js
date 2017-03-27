// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {
    closeDrawers,
    goBack,
    goToAbout,
    goToAccountSettings,
    goToSelectTeam
} from 'app/actions/navigation';
import {clearErrors} from 'mattermost-redux/actions/errors';

import {logout} from 'mattermost-redux/actions/users';
import navigationSceneConnect from 'app/scenes/navigationSceneConnect';
import {getTheme} from 'app/selectors/preferences';

import Settings from './settings';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state),
        errors: state.errors,
        currentUserId: state.entities.users.currentUserId,
        currentTeamId: state.entities.teams.currentTeamId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDrawers,
            goBack,
            goToAbout,
            goToAccountSettings,
            goToSelectTeam,
            clearErrors,
            logout
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Settings);
