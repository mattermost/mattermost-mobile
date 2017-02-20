// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {handleCommentDraftChanged} from 'app/actions/views/thread';
import {selectPost} from 'service/actions/posts';

import {makeGetPostsForThread} from 'service/selectors/entities/posts';
import {getTheme} from 'service/selectors/entities/preferences';

import navigationSceneConnect from '../navigationSceneConnect';
import Thread from './thread';

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
            handleCommentDraftChanged,
            selectPost
        }, dispatch)
    };
}

export default navigationSceneConnect(makeMapStateToProps, mapDispatchToProps)(Thread);
