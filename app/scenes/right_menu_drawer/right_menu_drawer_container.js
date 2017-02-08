// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack, goToModalSelectTeam} from 'app/actions/navigation';
import {goToFlaggedPosts, goToRecentMentions} from 'app/actions/views/right_menu_drawer';

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
            goBack,
            goToFlaggedPosts,
            goToRecentMentions,
            goToModalSelectTeam,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightMenuDrawer);
