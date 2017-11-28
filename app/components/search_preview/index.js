// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {makeGetPostIdsAroundPost} from 'mattermost-redux/selectors/entities/posts';
import {getPostsAfter, getPostsBefore, getPostThread} from 'mattermost-redux/actions/posts';
import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import SearchPreview from './search_preview';

function makeMapStateToProps() {
    const getPostIdsAroundPost = makeGetPostIdsAroundPost();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, {id: ownProps.channelId});
        const postIds = getPostIdsAroundPost(state, ownProps.focusedPostId, ownProps.channelId, {postsBeforeCount: 5, postsAfterCount: 5});

        return {
            channelName: channel ? channel.display_name : '',
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
