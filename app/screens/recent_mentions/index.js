// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId, selectPost} from 'mattermost-redux/actions/posts';
import {clearSearch, getRecentMentions} from 'mattermost-redux/actions/search';
import {RequestStatus} from 'mattermost-redux/constants';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {loadChannelsByTeamName, loadThreadIfNecessary} from 'app/actions/views/channel';
import {makePreparePostIdsForSearchPosts} from 'app/selectors/post_list';

import RecentMentions from './recent_mentions';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForSearchPosts();
    return (state) => {
        const postIds = preparePostIds(state, state.entities.search.results);
        const {recentMentions: recentMentionsRequest} = state.requests.search;
        const isLoading = recentMentionsRequest.status === RequestStatus.STARTED ||
            recentMentionsRequest.status === RequestStatus.NOT_STARTED;

        return {
            postIds,
            isLoading,
            didFail: recentMentionsRequest.status === RequestStatus.FAILURE,
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
            getRecentMentions,
            selectFocusedPostId,
            selectPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(RecentMentions);
