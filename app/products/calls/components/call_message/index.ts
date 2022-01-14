// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {Preferences} from '@mm-redux/constants';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getBool, getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getUser, getCurrentUser} from '@mm-redux/selectors/entities/users';
import {getUserCurrentTimezone} from '@mm-redux/utils/timezone_utils';
import {joinCall} from '@mmproducts/calls/store/actions/calls';
import {getCalls, getCurrentCall} from '@mmproducts/calls/store/selectors/calls';

import CallMessage from './call_message';

import type {Post} from '@mm-redux/types/posts';
import type {GlobalState} from '@mm-redux/types/store';
import type {Theme} from '@mm-redux/types/theme';

type OwnProps = {
    post: Post;
    theme: Theme;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const {post} = ownProps;
    const user = getUser(state, post.user_id);
    const currentUser = getCurrentUser(state);
    const currentCall = getCurrentCall(state);
    const call = getCalls(state)[post.channel_id];
    const enableTimezone = isTimezoneEnabled(state);

    return {
        user,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        confirmToJoin: Boolean(currentCall && call && currentCall.channelId !== call.channelId),
        alreadyInTheCall: Boolean(currentCall && call && currentCall.channelId === call.channelId),
        isMilitaryTime: getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'),
        userTimezone: enableTimezone ? getUserCurrentTimezone(currentUser.timezone) : undefined,
        currentChannelName: getChannel(state, post.channel_id)?.display_name,
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

export default connect(mapStateToProps, mapDispatchToProps)(CallMessage);
