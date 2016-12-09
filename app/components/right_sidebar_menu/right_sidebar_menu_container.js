// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToFlaggedPosts, goToRecentMentions} from 'app/actions/navigation';
import {logout} from 'service/actions/users';

import RightSidebarMenu from './right_sidebar_menu';

function mapStateToProps(state, ownProps) {
    return ownProps;
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToFlaggedPosts,
            goToRecentMentions,
            logout
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(RightSidebarMenu);
