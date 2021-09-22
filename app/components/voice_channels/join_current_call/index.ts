// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {joinCall} from '@mm-redux/actions/voiceCalls';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getVoiceCalls, getCurrentCall} from '@mm-redux/selectors/entities/voiceCalls';

import JoinCurrentCall from './join_current_call';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentChannelId = getCurrentChannelId(state);
    const call = getVoiceCalls(state)[currentChannelId];
    const currentCall = getCurrentCall(state);
    return {
        theme: getTheme(state),
        call: call === currentCall ? null : call,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            joinCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(JoinCurrentCall);
