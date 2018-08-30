// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel, getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {getAllowedServerMaxFileSize} from 'app/utils/file';

import ExtensionPost from './extension_post';

function mapStateToProps(state) {
    const config = getConfig(state);
    const {credentials} = state.entities.general;
    const {token, url} = credentials;
    let channel = getCurrentChannel(state);
    if (channel.delete_at !== 0) {
        channel = getDefaultChannel(state);
    }

    return {
        channelId: channel.id,
        currentUserId: getCurrentUserId(state),
        maxFileSize: getAllowedServerMaxFileSize(config),
        teamId: getCurrentTeamId(state),
        token,
        url,
    };
}

export default connect(mapStateToProps)(ExtensionPost);
