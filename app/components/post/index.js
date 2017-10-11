// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {addReaction, createPost, deletePost, removePost} from 'mattermost-redux/actions/posts';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'app/selectors/preferences';

import Post from './post';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    return {
        post,
        config,
        currentUserId: getCurrentUserId(state),
        highlight: ownProps.highlight,
        license,
        roles,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            createPost,
            deletePost,
            removePost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Post);
