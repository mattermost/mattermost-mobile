// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {handleRemoveLastFile, initUploadFiles} from '@actions/views/file_upload';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {canUploadFilesOnMobile, getConfig} from '@mm-redux/selectors/entities/general';
import {getDimensions} from '@selectors/device';
import {checkForFileUploadingInChannel} from '@selectors/file';
import {getAllowedServerMaxFileSize} from '@utils/file';

import Uploads from './uploads';

function mapStateToProps(state, ownProps) {
    const {deviceHeight} = getDimensions(state);
    const channelId = getCurrentChannelId(state);
    const config = getConfig(state);

    return {
        canUploadFiles: canUploadFilesOnMobile(state),
        channelId,
        channelIsLoading: state.views.channel.loading,
        deviceHeight,
        filesUploadingForCurrentChannel: checkForFileUploadingInChannel(state, channelId, ownProps.rootId),
        maxFileSize: getAllowedServerMaxFileSize(config),
    };
}

const mapDispatchToProps = {
    handleRemoveLastFile,
    initUploadFiles,
};

export default connect(mapStateToProps, mapDispatchToProps)(Uploads);
