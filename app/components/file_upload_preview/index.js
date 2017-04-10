// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleClearFiles, handleRemoveFile} from 'app/actions/views/file_upload';
import {addFileToFetchCache} from 'app/actions/views/file_preview';
import {getTheme} from 'app/selectors/preferences';

import FileUploadPreview from './file_upload_preview';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        channelIsLoading: state.views.channel.loading,
        createPostRequestStatus: state.requests.posts.createPost.status,
        fetchCache: state.views.fetchCache,
        uploadFileRequestStatus: state.requests.files.uploadFiles.status,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addFileToFetchCache,
            handleClearFiles,
            handleRemoveFile
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadPreview);
