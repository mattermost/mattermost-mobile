// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getPost, makeGetPostsAroundPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import SearchPreview from './search_preview';

function makeMapStateToProps() {
    const getPostsAroundPost = makeGetPostsAroundPost();

    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.focusedPostId);
        const postsAroundPost = getPostsAroundPost(state, post.id, post.channel_id);
        const focusedPostIndex = postsAroundPost ? postsAroundPost.findIndex((p) => p.id === ownProps.focusedPostId) : -1;
        let posts = [];

        if (focusedPostIndex !== -1) {
            const desiredPostIndexBefore = focusedPostIndex - 5;
            const minPostIndex = desiredPostIndexBefore < 0 ? 0 : desiredPostIndexBefore;
            posts = [...postsAroundPost].splice(minPostIndex, 10);
        }

        return {
            ...ownProps,
            channelId: post.channel_id,
            currentUserId: getCurrentUserId(state),
            posts
        };
    };
}

export default connect(makeMapStateToProps, null, null, {withRef: true})(SearchPreview);
