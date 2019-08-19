// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from 'mattermost-redux/actions/posts';
import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getPost, makeGetReactionsForPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {dismissModal, goToScreen} from 'app/actions/navigation';
import {loadThreadIfNecessary} from 'app/actions/views/channel';
import {isLandscape} from 'app/selectors/device';
import LongPost from './long_post';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    const getReactionsForPost = makeGetReactionsForPost();

    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.postId);
        const channel = post ? getChannel(state, {id: post.channel_id}) : null;
        const reactions = getReactionsForPost(state, post.id);

        return {
            channelName: channel ? channel.display_name : '',
            hasReactions: (reactions && Object.keys(reactions).length > 0) || Boolean(post.has_reactions),
            inThreadView: Boolean(state.entities.posts.selectedPostId),
            fileIds: post ? post.file_ids : false,
            theme: getTheme(state),
            isLandscape: isLandscape(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadThreadIfNecessary,
            selectPost,
            dismissModal,
            goToScreen,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(LongPost);
