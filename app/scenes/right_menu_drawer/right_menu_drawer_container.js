// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack, goToModalSelectTeam} from 'app/actions/navigation';
import {clearErrors} from 'mattermost-redux/actions/errors';

import {logout} from 'mattermost-redux/actions/users';
import {getTheme} from 'app/selectors/preferences';

import RightMenuDrawer from './right_menu_drawer';

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
            goBack,
            goToModalSelectTeam,
            clearErrors,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightMenuDrawer);
