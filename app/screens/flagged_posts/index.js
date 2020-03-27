// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId, selectPost} from '@redux/actions/posts';
import {clearSearch, getFlaggedPosts} from '@redux/actions/search';
import {getTheme} from '@redux/selectors/entities/preferences';

import {loadChannelsByTeamName, loadThreadIfNecessary} from 'app/actions/views/channel';
import {makePreparePostIdsForSearchPosts} from 'app/selectors/post_list';

import FlaggedPosts from './flagged_posts';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForSearchPosts();
    return (state) => {
        const postIds = preparePostIds(state, state.entities.search.flagged);

        return {
            postIds,
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
            getFlaggedPosts,
            selectFocusedPostId,
            selectPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(FlaggedPosts);
