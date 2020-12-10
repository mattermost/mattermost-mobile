// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {canUploadFilesOnMobile, getConfig} from '@mm-redux/selectors/entities/general';
import {getAllowedServerMaxFileSize} from '@utils/file';

import QuickActions from './quick_actions';

function mapStateToProps(state) {
    const config = getConfig(state);

    return {
        canUploadFiles: canUploadFilesOnMobile(state),
        maxFileSize: getAllowedServerMaxFileSize(config),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(QuickActions);
