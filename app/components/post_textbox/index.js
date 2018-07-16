// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {createPost} from 'mattermost-redux/actions/posts';
import {setStatus} from 'mattermost-redux/actions/users';
import {getCurrentChannel, isCurrentChannelReadOnly, getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {canUploadFilesOnMobile, getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import {executeCommand} from 'app/actions/views/command';
import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {handlePostDraftChanged, setChannelDisplayName, setChannelLoading} from 'app/actions/views/channel';
import {handleClearFiles, handleClearFailedFiles, handleRemoveLastFile, initUploadFiles} from 'app/actions/views/file_upload';
import {handleCommentDraftChanged, handleCommentDraftSelectionChanged} from 'app/actions/views/thread';
import {userTyping} from 'app/actions/views/typing';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';
import {getChannelMembersForDm} from 'app/selectors/channel';

import PostTextbox from './post_textbox';

const MAX_MESSAGE_LENGTH = 4000;

function mapStateToProps(state, ownProps) {
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);
    const config = getConfig(state);

    const currentChannel = getCurrentChannel(state);
    let deactivatedChannel = false;
    if (currentChannel && currentChannel.type === General.DM_CHANNEL) {
        const teammate = getChannelMembersForDm(state, currentChannel);
        if (teammate.length && teammate[0].delete_at) {
            deactivatedChannel = true;
        }
    }

    const currentUserId = getCurrentUserId(state);
    const status = getStatusForUserId(state, currentUserId);
    const userIsOutOfOffice = status === General.OUT_OF_OFFICE;

    return {
        channelId: ownProps.channelId || (currentChannel ? currentChannel.id : ''),
        canUploadFiles: canUploadFilesOnMobile(state),
        channelIsLoading: state.views.channel.loading,
        channelIsReadOnly: isCurrentChannelReadOnly(state),
        channelIsArchived: currentChannel ? currentChannel.delete_at !== 0 : false,
        currentUserId,
        userIsOutOfOffice,
        deactivatedChannel,
        files: currentDraft.files,
        maxMessageLength: (config && parseInt(config.MaxPostSize || 0, 10)) || MAX_MESSAGE_LENGTH,
        theme: getTheme(state),
        uploadFileRequestStatus: state.requests.files.uploadFiles.status,
        value: currentDraft.draft,
        defaultChannel: getDefaultChannel(state),
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
            initUploadFiles,
            userTyping,
            handleCommentDraftSelectionChanged,
            setStatus,
            setChannelDisplayName,
            setChannelLoading,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
