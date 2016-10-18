// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as postActions from 'actions/posts';
import PostsListView from 'components/posts_list_view';

const propTypes = {
    posts: PropTypes.object.isRequired,
    currentTeamId: PropTypes.string.isRequired,
    currentChannelId: PropTypes.string.isRequired,
    actions: PropTypes.object.isRequired
};

class PostsListContainer extends Component {
    static propTypes = propTypes;

    render() {
        return (
            <PostsListView
                posts={this.props.posts}
                currentTeamId={this.props.currentTeamId}
                currentChannelId={this.props.currentChannelId}
                actions={this.props.actions}
            />
        );
    }
}

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

export default connect(mapStateToProps, mapDispatchToProps)(PostsListContainer);
