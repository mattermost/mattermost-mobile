// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAllChannels, getCurrentChannel, getDefaultChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getConfig, canUploadFilesOnMobile} from '@mm-redux/selectors/entities/general';

import {getTeamChannels} from 'share_extension/android/actions';
import {getAllowedServerMaxFileSize} from 'app/utils/file';

import ExtensionPost from './extension_post';

function mapStateToProps(state) {
    const config = getConfig(state);

    let channel = getCurrentChannel(state);
    if (channel && (channel.delete_at !== 0)) {
        channel = getDefaultChannel(state);
    }

    return {
        channelId: channel?.id,
        channels: getAllChannels(state),
        currentUserId: getCurrentUserId(state),
        canUploadFiles: canUploadFilesOnMobile(state),
        maxFileSize: getAllowedServerMaxFileSize(config),
        teamId: getCurrentTeamId(state),
    };
}

const mapDispatchToProps = ({
    getTeamChannels,
});

export default connect(mapStateToProps, mapDispatchToProps)(ExtensionPost);
