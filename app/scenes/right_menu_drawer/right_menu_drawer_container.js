// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack} from 'app/actions/navigation';
import {goToFlaggedPosts, goToRecentMentions, goToSelectTeam} from 'app/actions/views/right_menu_drawer';

import {logout} from 'service/actions/users';

import RightMenuDrawer from './right_menu_drawer';

function mapStateToProps(state, ownProps) {
    return ownProps;
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack,
            goToFlaggedPosts,
            goToRecentMentions,
            goToSelectTeam,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightMenuDrawer);
