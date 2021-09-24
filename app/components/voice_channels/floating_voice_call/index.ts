// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {muteUser, unmuteUser} from '@mm-redux/actions/voiceCalls';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getTheme, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getCurrentCall} from '@mm-redux/selectors/entities/voiceCalls';

import FloatingVoiceCall from './floating_voice_call';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentCall = getCurrentCall(state);
    const currentUserId = getCurrentUserId(state);
    const speaker = currentCall && (Object.values(currentCall.participants).find((v) => v.isTalking === true) || Object.values(currentCall.participants)[0]);
    const currentParticipant = currentCall?.participants[currentUserId];
    return {
        theme: getTheme(state),
        call: currentCall,
        speaker,
        speakerUser: speaker ? state.entities.users.profiles[speaker.id] : null,
        channel: getChannel(state, currentCall?.channelId || ''),
        currentParticipant,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            muteUser,
            unmuteUser,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FloatingVoiceCall);
