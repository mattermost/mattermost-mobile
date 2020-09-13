// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from '@mm-redux/selectors/entities/general';
import {getDimensions} from '@selectors/device';

import ImagePreview from './gallery';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        canDownloadFiles: canDownloadFilesOnMobile(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ImagePreview);
