// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getPost, makeGetPostIdsAroundPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import SearchPreview from './search_preview';

function makeMapStateToProps() {
    const getPostIdsAroundPost = makeGetPostIdsAroundPost();

    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.focusedPostId);
        const postIds = getPostIdsAroundPost(state, post.id, post.channel_id, {postsBeforeCount: 5, postsAfterCount: 5});

        return {
            channelId: post.channel_id,
            currentUserId: getCurrentUserId(state),
            postIds
        };
    };
}

export default connect(makeMapStateToProps, null, null, {withRef: true})(SearchPreview);
