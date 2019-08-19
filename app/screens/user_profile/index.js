// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setChannelDisplayName} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import {isLandscape} from 'app/selectors/device';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTeammateNameDisplaySetting, getTheme, getBool} from 'mattermost-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from 'mattermost-redux/selectors/entities/timezone';
import Preferences from 'mattermost-redux/constants/preferences';
import {loadBot} from 'mattermost-redux/actions/bots';
import {getBotAccounts} from 'mattermost-redux/selectors/entities/bots';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {
    setButtons,
    dismissModal,
    goToScreen,
    dismissAllModals,
    popToRoot,
} from 'app/actions/navigation';

import UserProfile from './user_profile';

function mapStateToProps(state, ownProps) {
    const config = getConfig(state);
    const {createChannel: createChannelRequest} = state.requests.channels;
    const militaryTime = getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time');
    const enableTimezone = isTimezoneEnabled(state);

    return {
        config,
        createChannelRequest,
        currentDisplayName: state.views.channel.displayName,
        user: state.entities.users.profiles[ownProps.userId],
        bot: getBotAccounts(state)[ownProps.userId],
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        enableTimezone,
        militaryTime,
        theme: getTheme(state),
        isMyUser: getCurrentUserId(state) === ownProps.userId,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            makeDirectChannel,
            setChannelDisplayName,
            loadBot,
            setButtons,
            dismissModal,
            goToScreen,
            dismissAllModals,
            popToRoot,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UserProfile);
