// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {cancelUploadFileRequest} from 'mattermost-redux/actions/files';

import {handleClearFiles, handleRemoveFile} from 'app/actions/views/file_upload';

import FileUploadPreview from './file_upload_preview';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        createPostRequestStatus: state.requests.posts.createPost.status,
        uploadFileRequestStatus: state.requests.files.uploadFiles.status
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            cancelUploadFileRequest,
            handleClearFiles,
            handleRemoveFile
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadPreview);
