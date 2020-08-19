// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {convertChannelToPrivate} from '@mm-redux/actions/channels';
import {General} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {isAdmin as checkIsAdmin} from '@mm-redux/utils/user_utils';

import ConvertPrivate from './convert_private';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const isDefaultChannel = currentChannel.name === General.DEFAULT_CHANNEL;
    const isPublicChannel = currentChannel.type === General.OPEN_CHANNEL;
    const roles = getCurrentUserRoles(state) || '';
    const isAdmin = checkIsAdmin(roles);
    const canConvert = !isDefaultChannel && isPublicChannel && isAdmin;

    return {
        canConvert,
        channelId: currentChannel?.id || '',
        displayName: (currentChannel?.display_name || '').trim(),
    };
}

const mapDispatchToProps = {
    convertChannelToPrivate,
};

export default connect(mapStateToProps, mapDispatchToProps)(ConvertPrivate);
