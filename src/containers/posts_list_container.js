// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as postActions from 'actions/posts';
import PostsListView from 'components/posts_list_view';

function mapStateToProps(state) {
    return {
        posts: state.entities.posts,
        currentTeamId: state.entities.teams.currentTeamId,
        currentChannelId: state.entities.channels.currentChannelId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(postActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostsListView);
