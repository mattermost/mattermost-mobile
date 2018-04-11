// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getDimensions} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';

import ImagePreview from './image_preview';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        canDownloadFiles: canDownloadFilesOnMobile(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ImagePreview);
