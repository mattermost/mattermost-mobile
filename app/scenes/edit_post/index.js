// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {closeModal} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';

import {editPost} from 'mattermost-redux/actions/posts';

import EditPost from './edit_post';

function mapStateToProps(state, ownProps) {
    const {editPost: editPostRequest} = state.requests.posts;

    return {
        ...ownProps,
        editPostRequest,
        post: ownProps.post,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeModal,
            editPost
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(EditPost);
