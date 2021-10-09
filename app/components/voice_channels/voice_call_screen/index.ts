// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {muteMyself, unmuteMyself, leaveCall} from '@mm-redux/actions/voiceCalls';
import {getTheme, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getCurrentCall, getScreenShareURL} from '@mm-redux/selectors/entities/voiceCalls';
import {isLandscape} from '@selectors/device';

import VoiceCallScreen from './voice_call_screen';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentCall = getCurrentCall(state);
    const currentUserId = getCurrentUserId(state);
    return {
        theme: getTheme(state),
        call: currentCall,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        users: state.entities.users.profiles,
        currentParticipant: currentCall && currentCall.participants[currentUserId],
        screenShareURL: getScreenShareURL(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            muteMyself,
            unmuteMyself,
            leaveCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(VoiceCallScreen);
