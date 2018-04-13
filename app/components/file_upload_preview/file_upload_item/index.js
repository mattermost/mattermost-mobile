// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleRemoveFile, retryFileUpload, uploadComplete, uploadFailed} from 'app/actions/views/file_upload';

import FileUploadItem from './file_upload_item';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleRemoveFile,
            retryFileUpload,
            uploadComplete,
            uploadFailed,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadItem);
