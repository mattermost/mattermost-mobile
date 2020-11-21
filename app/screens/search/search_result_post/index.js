// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Posts} from '@mm-redux/constants';
import {getPost} from '@mm-redux/selectors/entities/posts';

import SearchResultPost from './search_result_post';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    return {
        isDeleted: post?.state === Posts.POST_DELETED,
    };
}

export default connect(mapStateToProps)(SearchResultPost);
