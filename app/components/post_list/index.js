// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectFocusedPostId} from 'mattermost-redux/actions/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {loadChannelsByTeamName, refreshChannelWithRetry} from 'app/actions/views/channel';
import {makePreparePostIdsForPostList, START_OF_NEW_MESSAGES} from 'app/selectors/post_list';

import PostList from './post_list';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForPostList();
    return (state, ownProps) => {
        const postIds = preparePostIds(state, ownProps);
        const measureCellLayout = postIds.indexOf(START_OF_NEW_MESSAGES) > -1 || Boolean(ownProps.highlightPostId);

        const {deviceHeight} = state.device.dimension;

        return {
            deviceHeight,
            measureCellLayout,
            postIds,
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadChannelsByTeamName,
            refreshChannelWithRetry,
            selectFocusedPostId,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostList);
