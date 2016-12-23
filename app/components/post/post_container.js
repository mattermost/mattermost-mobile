// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'service/selectors/entities/preferences';
import {getUser} from 'service/selectors/entities/user';

import Post from './post';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        user: getUser(state, ownProps.post.user_id),
        post: ownProps.post,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(Post);

