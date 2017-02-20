// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {createPost} from 'service/actions/posts';
import {userTyping} from 'service/actions/websocket';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentUserId} from 'service/selectors/entities/users';
import {getUsersTyping} from 'service/selectors/entities/typing';

import PostTextbox from './post_textbox';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        currentUserId: getCurrentUserId(state),
        typing: getUsersTyping(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            createPost,
            userTyping
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
