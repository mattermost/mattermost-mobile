// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToModalAccountSettings, goBack, goToModalSelectTeam} from 'app/actions/navigation';

import {logout} from 'service/actions/users';
import {getTheme} from 'service/selectors/entities/preferences';

import RightMenuDrawer from './right_menu_drawer';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToModalAccountSettings,
            goBack,
            goToModalSelectTeam,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightMenuDrawer);
