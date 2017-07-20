// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {handleRemoveFile, retryFileUpload} from 'app/actions/views/file_upload';
import {addFileToFetchCache} from 'app/actions/views/file_preview';
import {getTheme} from 'app/selectors/preferences';

import FileUploadPreview from './file_upload_preview';

const checkForFileUploadingInChannel = createSelector(
    (state, channelId, rootId) => {
        if (rootId) {
            return state.views.thread.drafts[rootId];
        }

        return state.views.channel.drafts[channelId];
    },
    (draft) => {
        return draft.files.some((f) => f.loading);
    }
);

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        channelIsLoading: state.views.channel.loading,
        createPostRequestStatus: state.requests.posts.createPost.status,
        fetchCache: state.views.fetchCache,
        filesUploadingForCurrentChannel: checkForFileUploadingInChannel(state, ownProps.channelId, ownProps.rootId),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addFileToFetchCache,
            handleRemoveFile,
            retryFileUpload
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadPreview);
