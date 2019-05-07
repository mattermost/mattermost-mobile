// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {createPost} from 'mattermost-redux/actions/posts';
import {setStatus} from 'mattermost-redux/actions/users';
import {getCurrentChannel, isCurrentChannelReadOnly} from 'mattermost-redux/selectors/entities/channels';
import {canUploadFilesOnMobile, getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import {executeCommand} from 'app/actions/views/command';
import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {handlePostDraftChanged, selectPenultimateChannel} from 'app/actions/views/channel';
import {handleClearFiles, handleClearFailedFiles, handleRemoveLastFile, initUploadFiles} from 'app/actions/views/file_upload';
import {handleCommentDraftChanged, handleCommentDraftSelectionChanged} from 'app/actions/views/thread';
import {userTyping} from 'app/actions/views/typing';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';
import {getChannelMembersForDm} from 'app/selectors/channel';
import {getAllowedServerMaxFileSize} from 'app/utils/file';

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
        channelTeamId: currentChannel ? currentChannel.team_id : '',
        canUploadFiles: canUploadFilesOnMobile(state),
        channelDisplayName: state.views.channel.displayName || (currentChannel ? currentChannel.display_name : ''),
        channelIsLoading: state.views.channel.loading,
        channelIsReadOnly: isCurrentChannelReadOnly(state) || false,
        channelIsArchived: ownProps.channelIsArchived || (currentChannel ? currentChannel.delete_at !== 0 : false),
        currentUserId,
        userIsOutOfOffice,
        deactivatedChannel,
        files: currentDraft.files,
        maxFileSize: getAllowedServerMaxFileSize(config),
        maxMessageLength: (config && parseInt(config.MaxPostSize || 0, 10)) || MAX_MESSAGE_LENGTH,
        theme: getTheme(state),
        uploadFileRequestStatus: state.requests.files.uploadFiles.status,
        value: currentDraft.draft,
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
            selectPenultimateChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostTextbox);
