// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {muteMyself, unmuteMyself, leaveCall} from '@mm-redux/actions/voiceCalls';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentCall} from '@mm-redux/selectors/entities/voiceCalls';

import VoiceCallScreen from './voice_call_screen';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
        call: getCurrentCall(state),
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
