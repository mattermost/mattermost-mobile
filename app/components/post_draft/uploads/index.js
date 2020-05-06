// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {handleRemoveLastFile} from '@actions/views/file_upload';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getDimensions} from '@selectors/device';
import {checkForFileUploadingInChannel} from '@selectors/file';

import Uploads from './uploads';

function mapStateToProps(state, ownProps) {
    const {deviceHeight} = getDimensions(state);
    const channelId = getCurrentChannelId(state);

    return {
        channelId,
        channelIsLoading: state.views.channel.loading,
        deviceHeight,
        filesUploadingForCurrentChannel: checkForFileUploadingInChannel(state, channelId, ownProps.rootId),
    };
}

const mapDispatchToProps = {
    handleRemoveLastFile,
};

export default connect(mapStateToProps, mapDispatchToProps)(Uploads);
