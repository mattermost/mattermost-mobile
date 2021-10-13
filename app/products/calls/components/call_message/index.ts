// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getUser} from '@mm-redux/selectors/entities/users';
import {joinCall} from '@products/calls/store/actions/calls';
import {getCalls, getCurrentCall} from '@products/calls/store/selectors/calls';

import CallMessage from './call_message';

import type {Post} from '@mm-redux/types/posts';
import type {GlobalState} from '@mm-redux/types/store';
import type {Theme} from '@mm-redux/types/theme';

type OwnProps = {
    post: Post;
    theme: Theme;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const {post} = ownProps;
    const user = getUser(state, post.user_id);
    const currentCall = getCurrentCall(state);
    const call = getCalls(state)[post.channel_id];

    return {
        user,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        confirmToJoin: Boolean(currentCall && call),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            joinCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CallMessage);
