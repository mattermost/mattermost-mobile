// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {setMenuActionSelector, selectAttachmentMenuAction} from 'app/actions/views/post';

import ActionMenu from './action_menu';

function mapStateToProps(state, ownProps) {
    return {
        theme: getTheme(state),
        selected: state.views.post.submittedMenuActions[ownProps.postId],
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectAttachmentMenuAction,
            setMenuActionSelector,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionMenu);
