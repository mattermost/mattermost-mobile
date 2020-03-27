// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from '@redux/selectors/entities/general';

import {getDimensions} from 'app/selectors/device';

import ImagePreview from './image_preview';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        canDownloadFiles: canDownloadFilesOnMobile(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ImagePreview);
