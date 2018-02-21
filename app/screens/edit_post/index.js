// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {editPost} from 'mattermost-redux/actions/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getDimensions} from 'app/selectors/device';

import EditPost from './edit_post';

function mapStateToProps(state, ownProps) {
    const {editPost: editPostRequest} = state.requests.posts;

    return {
        ...getDimensions(state),
        editPostRequest,
        post: ownProps.post,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            editPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditPost);
