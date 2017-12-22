// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {createPost} from 'mattermost-redux/actions/posts';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {canUploadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {executeCommand} from 'app/actions/views/command';
import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {handlePostDraftChanged, handlePostDraftSelectionChanged} from 'app/actions/views/channel';
import {handleClearFiles, handleClearFailedFiles, handleRemoveLastFile, handleUploadFiles} from 'app/actions/views/file_upload';
import {handleCommentDraftChanged, handleCommentDraftSelectionChanged} from 'app/actions/views/thread';
import {userTyping} from 'app/actions/views/typing';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';

import PostTextbox from './post_textbox';

function mapStateToProps(state, ownProps) {
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);

    return {
        channelId: ownProps.channelId || getCurrentChannelId(state),
        canUploadFiles: canUploadFilesOnMobile(state),
        channelIsLoading: state.views.channel.loading,
        currentUserId: getCurrentUserId(state),
        files: currentDraft.files,
        theme: getTheme(state),
        uploadFileRequestStatus: state.requests.files.uploadFiles.status,
        value: currentDraft.draft
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReactionToLatestPost,
            createPost,
            executeCommand,
            handleClearFiles,
            handleClearFailedFiles,
            handleCommentDraftChanged,
            handlePostDraftChanged,
            handleRemoveLastFile,
            handleUploadFiles,
            userTyping,
            handlePostDraftSelectionChanged,
            handleCommentDraftSelectionChanged
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
