// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {createSelector} from 'reselect';

import {handleCommentDraftChanged} from 'app/actions/views/thread';

import {getAllPosts} from 'service/selectors/entities/posts';
import {getTheme} from 'service/selectors/entities/preferences';

import navigationSceneConnect from '../navigationSceneConnect';
import Thread from './thread';

export function makeGetPostsForThread() {
    return createSelector(
        getAllPosts,
        (state, props) => state.entities.posts.postsByChannel[props.channelId],
        (state, props) => props,
        (posts, postIds, {rootId}) => {
            const thread = [];

            for (const id of postIds) {
                const post = posts[id];

                if (id === rootId || post.root_id === rootId) {
                    thread.push(post);
                }
            }

            return thread;
        }
    );
}

function makeMapStateToProps() {
    // Create a getPostsForThread selector for each instance of Thread so that each Thread
    // is memoized correctly based on its own props
    const getPostsForThread = makeGetPostsForThread();

    return function mapStateToProps(state, ownProps) {
        const posts = getPostsForThread(state, ownProps);

        return {
            ...ownProps,
            teamId: state.entities.channels.channels[ownProps.channelId].team_id,
            channelId: ownProps.channelId,
            rootId: ownProps.rootId,
            draft: state.views.thread.draft[ownProps.rootId] || '',
            posts,
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleCommentDraftChanged
        }, dispatch)
    };
}

export default navigationSceneConnect(makeMapStateToProps, mapDispatchToProps)(Thread);
