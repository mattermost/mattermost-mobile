// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId, selectPost} from 'mattermost-redux/actions/posts';
import {clearSearch, getPinnedPosts} from 'mattermost-redux/actions/search';
import {RequestStatus} from 'mattermost-redux/constants';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {loadChannelsByTeamName, loadThreadIfNecessary} from 'app/actions/views/channel';
import {showSearchModal} from 'app/actions/views/search';
import {makePreparePostIdsForSearchPosts} from 'app/selectors/post_list';

import PinnedPosts from './pinned_posts';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForSearchPosts();
    return (state, ownProps) => {
        const {pinned} = state.entities.search;
        const channelPinnedPosts = pinned[ownProps.currentChannelId] || [];
        const postIds = preparePostIds(state, channelPinnedPosts);
        const {pinnedPosts: pinnedPostsRequest} = state.requests.search;
        const isLoading = pinnedPostsRequest.status === RequestStatus.STARTED ||
            pinnedPostsRequest.status === RequestStatus.NOT_STARTED;

        return {
            postIds,
            isLoading,
            didFail: pinnedPostsRequest.status === RequestStatus.FAILURE,
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearSearch,
            loadChannelsByTeamName,
            loadThreadIfNecessary,
            getPinnedPosts,
            selectFocusedPostId,
            selectPost,
            showSearchModal,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PinnedPosts);
