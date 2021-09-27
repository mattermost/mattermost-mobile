// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {joinCall} from '@mm-redux/actions/voiceCalls';
import {getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getUser} from '@mm-redux/selectors/entities/users';
import {getVoiceCalls, getCurrentCall} from '@mm-redux/selectors/entities/voiceCalls';

import VoiceCallMessage from './voice_call_message';

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
    const call = getVoiceCalls(state)[post.channel_id];

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

export default connect(mapStateToProps, mapDispatchToProps)(VoiceCallMessage);
