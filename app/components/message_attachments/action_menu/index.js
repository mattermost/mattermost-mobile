// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectAttachmentMenuAction} from 'app/actions/views/post';

import ActionMenu from './action_menu';

function mapStateToProps(state, ownProps) {
    const actions = state.views.post.submittedMenuActions[ownProps.postId];
    const selected = actions?.[ownProps.id];

    return {
        selected,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectAttachmentMenuAction,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionMenu);
