// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getDimensions} from 'app/selectors/device';
import {checkForFileUploadingInChannel} from 'app/selectors/file';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';

import FileUploadPreview from './file_upload_preview';

function mapStateToProps(state, ownProps) {
    const {deviceHeight} = getDimensions(state);
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);
    const channelId = getCurrentChannelId(state);

    return {
        channelId,
        channelIsLoading: state.views.channel.loading,
        deviceHeight,
        files: currentDraft.files,
        filesUploadingForCurrentChannel: checkForFileUploadingInChannel(state, channelId, ownProps.rootId),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(FileUploadPreview);
