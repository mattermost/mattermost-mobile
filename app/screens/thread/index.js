// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleCommentDraftChanged} from 'app/actions/views/thread';
import {getTheme} from 'app/selectors/preferences';

import {selectPost} from 'mattermost-redux/actions/posts';
import {makeGetPostsForThread} from 'mattermost-redux/selectors/entities/posts';
import {getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';

import Thread from './thread';

function makeMapStateToProps() {
    // Create a getPostsForThread selector for each instance of Thread so that each Thread
    // is memoized correctly based on its own props
    const getPostsForThread = makeGetPostsForThread();

    return function mapStateToProps(state, ownProps) {
        const posts = getPostsForThread(state, ownProps);
        const threadDraft = state.views.thread.drafts[ownProps.rootId];

        return {
            ...ownProps,
            channelId: ownProps.channelId,
            myMember: getMyCurrentChannelMembership(state),
            rootId: ownProps.rootId,
            draft: threadDraft.draft,
            files: threadDraft.files,
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

export default connect(makeMapStateToProps, mapDispatchToProps)(Thread);
