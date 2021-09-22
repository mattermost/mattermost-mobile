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
            {id: 'xohi8cki9787fgiryne716u84o', username: 'mgdelacroix', volume: 1, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'harshil', volume: 0.5, handRaised: false, muted: true},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'hamedia', volume: 0, handRaised: true, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'jespino', volume: 0, handRaised: false, muted: true},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'chen', volume: 0.7, handRaised: false, muted: false},
            {id: 'xohi8cki9787fgiryne716u84o', username: 'scott', volume: 0.2, handRaised: false, muted: true},
        ],
        muted: false,
    };
}

export default connect(mapStateToProps)(VoiceCallScreen);
