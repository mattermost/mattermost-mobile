// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {editPost} from '@mm-redux/actions/posts';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {getDimensions, isLandscape} from 'app/selectors/device';

import EditPost from './edit_post';

function mapStateToProps(state, ownProps) {
    return {
        ...getDimensions(state),
        post: ownProps.post,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
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
