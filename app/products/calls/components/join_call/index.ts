// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getChannel, getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {joinCall} from '@mmproducts/calls/store/actions/calls';
import {getCalls, getCurrentCall} from '@mmproducts/calls/store/selectors/calls';

import JoinCall from './join_call';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentChannelId = getCurrentChannelId(state);
    const call = getCalls(state)[currentChannelId];
    const currentCall = getCurrentCall(state);
    return {
        theme: getTheme(state),
        call: call === currentCall ? null : call,
        confirmToJoin: Boolean(currentCall && call && currentCall.channelId !== call.channelId),
        alreadyInTheCall: Boolean(currentCall && call && currentCall.channelId === call.channelId),
        currentChannelName: getChannel(state, currentChannelId)?.display_name,
        callChannelName: currentCall ? getChannel(state, currentCall.channelId)?.display_name : '',
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            joinCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(JoinCall);
