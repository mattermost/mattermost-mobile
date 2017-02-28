// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'service/selectors/entities/preferences';

import PostList from './post_list';

function mapStateToProps(state, ownProps) {
    return {
        theme: getTheme(state),
        postsRequests: state.requests.posts,
        ...ownProps
    };
}

export default connect(mapStateToProps)(PostList);
