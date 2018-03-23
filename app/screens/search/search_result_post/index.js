// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {Posts} from 'mattermost-redux/constants';
import {getPost} from 'mattermost-redux/selectors/entities/posts';

import SearchResultPost from './search_result_post';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    return {
        isDeleted: post && post.state === Posts.POST_DELETED,
    };
}

export default connect(mapStateToProps)(SearchResultPost);
