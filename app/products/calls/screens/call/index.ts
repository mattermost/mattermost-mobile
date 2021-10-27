// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getTheme, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {muteMyself, unmuteMyself, leaveCall} from '@mmproducts/calls//store/actions/calls';
import {getCurrentCall, getScreenShareURL} from '@mmproducts/calls/store/selectors/calls';

import CallScreen from './call_screen';

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

export default connect(mapStateToProps, mapDispatchToProps)(CallScreen);
