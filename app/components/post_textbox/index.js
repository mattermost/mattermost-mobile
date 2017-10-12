// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {createPost} from 'mattermost-redux/actions/posts';
import {userTyping} from 'mattermost-redux/actions/websocket';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {canUploadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {handlePostDraftChanged} from 'app/actions/views/channel';
import {handleClearFiles, handleRemoveLastFile, handleUploadFiles} from 'app/actions/views/file_upload';
import {handleCommentDraftChanged} from 'app/actions/views/thread';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';

import PostTextbox from './post_textbox';

function mapStateToProps(state, ownProps) {
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);

    return {
        channelId: getCurrentChannelId(state),
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
            handleClearFiles,
            handleCommentDraftChanged,
            handlePostDraftChanged,
            handleRemoveLastFile,
            handleUploadFiles,
            userTyping
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
