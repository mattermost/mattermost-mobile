// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToModalAccountSettings, goBack, goToModalSelectTeam} from 'app/actions/navigation';
import {clearErrors} from 'service/actions/errors';

import {logout} from 'service/actions/users';
import {getTheme} from 'service/selectors/entities/preferences';

import RightMenuDrawer from './right_menu_drawer';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state),
        errors: state.errors,
        currentUserId: state.entities.users.currentId,
        currentTeamId: state.entities.teams.currentId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToModalAccountSettings,
            goBack,
            goToModalSelectTeam,
            clearErrors,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightMenuDrawer);
