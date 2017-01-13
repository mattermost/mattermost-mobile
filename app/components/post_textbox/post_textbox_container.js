// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {createPost} from 'service/actions/posts';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentUserId} from 'service/selectors/entities/users';

import PostTextbox from './post_textbox';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        currentUserId: getCurrentUserId(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            createPost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
