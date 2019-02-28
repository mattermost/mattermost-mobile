// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getDimensions} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';

import ImagePreview from './image_preview';
import LocalConfig from 'assets/config';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        canDownloadFiles: canDownloadFilesOnMobile(state) && LocalConfig.EnableAttachmentDownloads,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ImagePreview);
