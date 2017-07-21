// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {createPost, deletePost, removePost} from 'mattermost-redux/actions/posts';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';

import {setPostTooltipVisible} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import Post from './post';

function makeMapStateToProps() {
    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.post.id);

        const {config, license} = state.entities.general;
        const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
        const {tooltipVisible} = state.views.channel;

        return {
            ...ownProps,
            post,
            config,
            currentUserId: getCurrentUserId(state),
            highlight: ownProps.post.highlight,
            license,
            roles,
            theme: getTheme(state),
            tooltipVisible
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            createPost,
            deletePost,
            removePost,
            setPostTooltipVisible
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Post);
