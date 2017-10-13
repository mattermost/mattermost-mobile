// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {selectPost} from 'mattermost-redux/actions/posts';
import {makeGetPostsForThread} from 'mattermost-redux/selectors/entities/posts';
import {getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';

import Thread from './thread';

function makeMapStateToProps() {
    // Create a getPostsForThread selector for each instance of Thread so that each Thread
    // is memoized correctly based on its own props
    const getPostIdsForThread = createSelector(
        makeGetPostsForThread(),
        (posts) => {
            if (!posts) {
                return [];
            }

            return posts.map((post) => post.id);
        }
    );

    return function mapStateToProps(state, ownProps) {
        return {
            channelId: ownProps.channelId,
            myMember: getMyCurrentChannelMembership(state),
            rootId: ownProps.rootId,
            postIds: getPostIdsForThread(state, {rootId: ownProps.rootId}),
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectPost
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Thread);
