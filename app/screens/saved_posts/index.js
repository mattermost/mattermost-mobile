// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {showPermalink} from '@actions/views/permalink';
import {getPostThread} from '@actions/views/post';
import {selectPost} from '@mm-redux/actions/posts';
import {clearSearch, getFlaggedPosts} from '@mm-redux/actions/search';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {makePreparePostIdsForSearchPosts} from '@selectors/post_list';

import SavedPosts from './saved_posts';

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
            getPostThread,
            getFlaggedPosts,
            selectPost,
            showPermalink,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(SavedPosts);
