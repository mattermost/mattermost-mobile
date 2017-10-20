// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPost, makeGetPostIdsAroundPost} from 'mattermost-redux/selectors/entities/posts';
import {getPostsAfter, getPostsBefore, getPostThread} from 'mattermost-redux/actions/posts';
import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import SearchPreview from './search_preview';

function makeMapStateToProps() {
    const getPostIdsAroundPost = makeGetPostIdsAroundPost();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.focusedPostId);
        const channel = getChannel(state, {id: post.channel_id});
        const postIds = getPostIdsAroundPost(state, post.id, post.channel_id, {postsBeforeCount: 5, postsAfterCount: 5});

        return {
            channelId: post.channel_id,
            channelName: channel.display_name,
            currentUserId: getCurrentUserId(state),
            postIds
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPostsAfter,
            getPostsBefore,
            getPostThread
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps, null, {withRef: true})(SearchPreview);
