// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {muteMyself, unmuteMyself} from '@mm-redux/actions/voiceCalls';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentCall} from '@mm-redux/selectors/entities/voiceCalls';

import FloatingVoiceCall from './floating_voice_call';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentCall = getCurrentCall(state);
    return {
        theme: getTheme(state),
        call: currentCall,
        channel: getChannel(state, currentCall?.channelId || ''),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            muteMyself,
            unmuteMyself,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FloatingVoiceCall);
