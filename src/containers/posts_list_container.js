// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as postActions from 'actions/posts';
import PostsListView from 'components/posts_list_view';

function mapStateToProps(state) {
    return {
        post: state.entities.post,
        currentTeamId: state.entities.team.currentTeamId,
        currentChannelId: state.entities.channel.currentChannelId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(postActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostsListView);
