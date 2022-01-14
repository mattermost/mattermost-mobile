// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {setChannelDisplayName} from '@actions/views/channel';
import {getChannelStats} from '@mm-redux/actions/channels';
import {getCustomEmojisInText} from '@mm-redux/actions/emojis';
import {General} from '@mm-redux/constants';
import {getCurrentChannel, getCurrentChannelStats} from '@mm-redux/selectors/entities/channels';
import {getFeatureFlagValue} from '@mm-redux/selectors/entities/general';
import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserRoles, getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {getUserIdFromChannelName} from '@mm-redux/utils/channel_utils';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin, displayUsername} from '@mm-redux/utils/user_utils';
import {joinCall, enableChannelCalls, disableChannelCalls} from '@mmproducts/calls/store/actions/calls';
import {isCallsEnabled} from '@mmproducts/calls/store/selectors/calls';
import {makeGetCustomStatus, isCustomStatusEnabled, isCustomStatusExpired, isCustomStatusExpirySupported} from '@selectors/custom_status';
import {isGuest} from '@utils/users';

import ChannelInfo from './channel_info';

function makeMapStateToProps() {
    const getCustomStatus = makeGetCustomStatus();
    return (state) => {
        const currentChannel = getCurrentChannel(state) || {};
        const currentChannelCreator = getUser(state, currentChannel.creator_id);
        const teammateNameDisplay = getTeammateNameDisplaySetting(state);
        const currentChannelCreatorName = displayUsername(currentChannelCreator, teammateNameDisplay);
        const currentChannelStats = getCurrentChannelStats(state);
        let currentChannelMemberCount = currentChannelStats && currentChannelStats.member_count;
        let currentChannelGuestCount = (currentChannelStats && currentChannelStats.guest_count) || 0;
        const currentUserId = getCurrentUserId(state);

        let teammateId;
        let isTeammateGuest = false;
        let customStatusEnabled = false;
        let customStatus;
        let customStatusExpired = true;
        let customStatusExpirySupported = false;
        const roles = getCurrentUserRoles(state) || '';
        const isChannelAdmin = checkIsAdmin(roles) || checkIsChannelAdmin(roles);
        const isDirectMessage = currentChannel.type === General.DM_CHANNEL;

        if (isDirectMessage) {
            teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
            const teammate = getUser(state, teammateId);
            if (isGuest(teammate)) {
                isTeammateGuest = true;
                currentChannelGuestCount = 1;
            }
            customStatusEnabled = isCustomStatusEnabled(state);
            customStatus = customStatusEnabled ? getCustomStatus(state, teammateId) : undefined;
            customStatusExpired = customStatusEnabled ? isCustomStatusExpired(state, customStatus) : true;
            customStatusExpirySupported = customStatusEnabled ? isCustomStatusExpirySupported(state) : false;
        }

        if (currentChannel.type === General.GM_CHANNEL) {
            currentChannelMemberCount = currentChannel.display_name.split(',').length;
        }

        const callsFeatureEnabled = getFeatureFlagValue(state, 'CallsMobile') === 'true';

        return {
            currentChannel,
            currentChannelCreatorName,
            currentChannelGuestCount,
            currentChannelMemberCount,
            currentUserId,
            isTeammateGuest,
            isDirectMessage,
            teammateId,
            theme: getTheme(state),
            customStatus,
            isCustomStatusEnabled: customStatusEnabled,
            isCustomStatusExpired: customStatusExpired,
            isCustomStatusExpirySupported: customStatusExpirySupported,
            isCallsEnabled: isCallsEnabled(state),
            callsFeatureEnabled,
            isChannelAdmin,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats,
            getCustomEmojisInText,
            setChannelDisplayName,
            joinCall,
            enableChannelCalls,
            disableChannelCalls,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelInfo);
