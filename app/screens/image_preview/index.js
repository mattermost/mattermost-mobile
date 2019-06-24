// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';

import {dismissModal, showModalOverCurrentContext} from 'app/actions/navigation';
import {getDimensions} from 'app/selectors/device';

import ImagePreview from './image_preview';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        canDownloadFiles: canDownloadFilesOnMobile(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissModal,
            showModalOverCurrentContext,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ImagePreview);
