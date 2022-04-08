// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {General} from '@mm-redux/constants';
import {getTheme, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {
    muteMyself,
    unmuteMyself,
    leaveCall,
    setSpeakerphoneOn,
    raiseHand,
    unraiseHand,
} from '@mmproducts/calls//store/actions/calls';
import {getCurrentCall, getScreenShareURL, isSpeakerphoneOn} from '@mmproducts/calls/store/selectors/calls';
import {sortParticipants} from '@mmproducts/calls/utils';

import CallScreen from './call_screen';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentCall = getCurrentCall(state);
    const currentUserId = getCurrentUserId(state);
    const teammateNameDisplay = getTeammateNameDisplaySetting(state) || General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
    return {
        theme: getTheme(state),
        call: currentCall,
        teammateNameDisplay,
        participants: sortParticipants(teammateNameDisplay, currentCall?.participants, currentCall?.screenOn),
        currentParticipant: currentCall && currentCall.participants[currentUserId],
        screenShareURL: getScreenShareURL(state),
        speakerphoneOn: isSpeakerphoneOn(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            muteMyself,
            unmuteMyself,
            setSpeakerphoneOn,
            leaveCall,
            raiseHand,
            unraiseHand,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CallScreen);
