// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {
    closeDMChannel,
    closeGMChannel,
    leaveChannel,
} from '@actions/views/channel';
import {General} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getFavoritesPreferences} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {isGuest as isUserGuest} from '@utils/users';

import Leave from './leave';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const currentUser = getCurrentUser(state);
    const favoriteChannels = getFavoritesPreferences(state) || [];
    const isGuest = isUserGuest(currentUser);
    const isDefaultChannel = currentChannel.name === General.DEFAULT_CHANNEL;
    const isDirectMessage = currentChannel.type === General.DM_CHANNEL;
    const isGroupMessage = currentChannel.type === General.GM_CHANNEL;
    const canLeave = (!isDefaultChannel && !isDirectMessage && !isGroupMessage) || (isDefaultChannel && isGuest);

    return {
        canLeave,
        currentChannel,
        displayName: (currentChannel?.display_name || '').trim(),
        isDirectMessage,
        isFavorite: favoriteChannels.indexOf(currentChannel?.id) > -1,
        isGroupMessage,
        isPublic: currentChannel?.type === General.OPEN_CHANNEL,
    };
}

const mapDispatchToProps = {
    closeDMChannel,
    closeGMChannel,
    leaveChannel,
};

export default connect(mapStateToProps, mapDispatchToProps)(Leave);
