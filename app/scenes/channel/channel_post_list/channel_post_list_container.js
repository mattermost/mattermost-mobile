// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadPostsIfNecessary} from 'app/actions/views/channel';

import {getPostsInCurrentChannel} from 'service/selectors/entities/posts';

import ChannelPostList from './channel_post_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        posts: getPostsInCurrentChannel(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessary
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
