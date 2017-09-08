// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {Posts} from 'mattermost-redux/constants';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {isPostFlagged, isSystemMessage} from 'mattermost-redux/utils/post_utils';

import {getTheme} from 'app/selectors/preferences';

import PostBody from './post_body';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);
    const myPreferences = getMyPreferences(state);

    return {
        ...ownProps,
        postProps: post.props || {},
        fileIds: post.file_ids,
        hasBeenDeleted: post.state === Posts.POST_DELETED,
        hasReactions: post.has_reactions,
        isFailed: post.failed,
        isFlagged: isPostFlagged(post.id, myPreferences),
        isPending: post.id === post.pending_post_id,
        isSystemMessage: isSystemMessage(post),
        message: post.message,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            flagPost,
            unflagPost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostBody);
