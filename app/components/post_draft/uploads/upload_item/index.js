// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import UploadItem from './upload_item';

import {handleRemoveFile, retryFileUpload, uploadComplete, uploadFailed} from 'app/actions/views/file_upload';

const mapDispatchToProps = {
    handleRemoveFile,
    retryFileUpload,
    uploadComplete,
    uploadFailed,
};

export default connect(null, mapDispatchToProps)(UploadItem);
