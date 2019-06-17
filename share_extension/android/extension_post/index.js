// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getAllChannels, getCurrentChannel, getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {getTeamChannels} from 'share_extension/android/actions';
import {getAllowedServerMaxFileSize} from 'app/utils/file';

import ExtensionPost from './extension_post';

function mapStateToProps(state) {
    const config = getConfig(state);

    let channel = getCurrentChannel(state);
    if (channel && channel.delete_at !== 0) {
        channel = getDefaultChannel(state);
    }

    return {
        channelId: channel?.id,
        channels: getAllChannels(state),
        currentUserId: getCurrentUserId(state),
        maxFileSize: getAllowedServerMaxFileSize(config),
        teamId: getCurrentTeamId(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeamChannels,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ExtensionPost);
