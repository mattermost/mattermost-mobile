// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import VoiceCallScreen from './voice_call_screen';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
        users: [
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'user-1', volume: 1, handRaised: false, muted: false},
        ],
        muted: false,
    };
}

export default connect(mapStateToProps)(VoiceCallScreen);
