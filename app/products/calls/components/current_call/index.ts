// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getTheme, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {muteMyself, unmuteMyself} from '@mmproducts/calls/store/actions/calls';
import {getCurrentCall} from '@mmproducts/calls/store/selectors/calls';

import CurrentCall from './current_call';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentCall = getCurrentCall(state);
    const currentUserId = getCurrentUserId(state);
    const speakerId = currentCall && currentCall.speakers && currentCall.speakers[0];
    const speaker = currentCall && ((speakerId && currentCall.participants[speakerId]) || Object.values(currentCall.participants)[0]);
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
            muteMyself,
            unmuteMyself,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CurrentCall);
