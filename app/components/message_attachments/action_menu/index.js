// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {setMenuActionSelector, selectAttachmentMenuAction} from 'app/actions/views/post';

import ActionMenu from './action_menu';

function mapStateToProps(state, ownProps) {
    const actions = state.views.post.submittedMenuActions[ownProps.postId];
    const selected = actions?.[ownProps.id];

    return {
        selected,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
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
