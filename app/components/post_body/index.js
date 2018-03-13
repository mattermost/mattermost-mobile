// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {Posts} from 'mattermost-redux/constants';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isEdited, isPostEphemeral, isSystemMessage} from 'mattermost-redux/utils/post_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    let isFailed = post.failed;
    let isPending = post.id === post.pending_post_id;
    if (isPending && Date.now() - post.create_at > POST_TIMEOUT) {
        // Something has prevented the post from being set to failed, so it's safe to assume
        // that it has actually failed by this point
        isFailed = true;
        isPending = false;
    }

    return {
        postProps: post.props || {},
        fileIds: post.file_ids,
        hasBeenDeleted: post.state === Posts.POST_DELETED,
        hasBeenEdited: isEdited(post),
        hasReactions: post.has_reactions,
        isFailed,
        isPending,
        isPostEphemeral: isPostEphemeral(post),
        isSystemMessage: isSystemMessage(post),
        message: post.message,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            flagPost,
            unflagPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostBody);
