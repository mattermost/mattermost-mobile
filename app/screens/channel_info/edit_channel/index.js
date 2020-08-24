// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel, isCurrentChannelReadOnly} from '@mm-redux/selectors/entities/channels';
import {getConfig, getLicense} from '@mm-redux/selectors/entities/general';
import {getCurrentUserId, getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {showManagementOptions} from '@mm-redux/utils/channel_utils';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin, isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';

import EditChannel from './edit_channel';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const currentChannel = getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);
    const roles = getCurrentUserRoles(state) || '';
    const isAdmin = checkIsAdmin(roles);
    const isChannelAdmin = checkIsChannelAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);

    let channelIsReadOnly = false;
    if (currentUserId && currentChannel.id) {
        channelIsReadOnly = isCurrentChannelReadOnly(state) || false;
    }

    const canEdit = !channelIsReadOnly && showManagementOptions(state, config, license, currentChannel, isAdmin, isSystemAdmin, isChannelAdmin);

    return {
        canEdit,
    };
}

export default connect(mapStateToProps)(EditChannel);
