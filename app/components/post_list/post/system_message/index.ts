// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getUser} from '@mm-redux/selectors/entities/users';

import type {GlobalState} from '@mm-redux/types/store';
import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

import SystemMessage from './system_message';

type OwnProps = {
    post: Post;
    theme: Theme;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const {post} = ownProps;
    const user = getUser(state, post.user_id);

    return {
        ownerUsername: user?.username || '',
    };
}

export default connect(mapStateToProps)(SystemMessage);
