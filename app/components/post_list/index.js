// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {refreshChannelWithRetry} from 'app/actions/views/channel';
import {makePreparePostIdsForPostList, START_OF_NEW_MESSAGES} from 'app/selectors/post_list';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import PostList from './post_list';

function makeMapStateToProps() {
    const preparePostIds = makePreparePostIdsForPostList();
    return (state, ownProps) => {
        const postIds = preparePostIds(state, ownProps);

        let initialBatchToRender = 15;
        if (!ownProps.highlistPostId) {
            const newMessageIndex = postIds.indexOf(START_OF_NEW_MESSAGES);
            if (newMessageIndex !== -1 && newMessageIndex > 15) {
                initialBatchToRender = newMessageIndex + 2;
            }
        }

        return {
            initialBatchToRender,
            postIds,
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            refreshChannelWithRetry
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostList);
