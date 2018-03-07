// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {getAllowedServerMaxFileSize} from 'app/utils/file';

import ExtensionPost from './extension_post';

function mapStateToProps(state) {
    const {config, credentials} = state.entities.general;
    const {token, url} = credentials;

    return {
        channelId: getCurrentChannelId(state),
        currentUserId: getCurrentUserId(state),
        maxFileSize: getAllowedServerMaxFileSize(config),
        teamId: getCurrentTeamId(state),
        token,
        url,
    };
}

export default connect(mapStateToProps)(ExtensionPost);
