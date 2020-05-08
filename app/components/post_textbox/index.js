// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {General, Permissions} from '@mm-redux/constants';
import {createPost} from '@mm-redux/actions/posts';
import {setStatus} from '@mm-redux/actions/users';
import {getCurrentChannel, isCurrentChannelReadOnly, getCurrentChannelStats} from '@mm-redux/selectors/entities/channels';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {canUploadFilesOnMobile, getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, getStatusForUserId} from '@mm-redux/selectors/entities/users';
import {getChannelTimezones} from '@mm-redux/actions/channels';

import {executeCommand} from 'app/actions/views/command';
import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {handlePostDraftChanged, selectPenultimateChannel} from 'app/actions/views/channel';
import {handleClearFiles, handleClearFailedFiles, handleRemoveLastFile, initUploadFiles} from 'app/actions/views/file_upload';
import {handleCommentDraftChanged, handleCommentDraftSelectionChanged} from 'app/actions/views/thread';
import {userTyping} from 'app/actions/views/typing';
import {getCurrentChannelDraft, getThreadDraft} from 'app/selectors/views';
import {getChannelMembersForDm} from 'app/selectors/channel';
import {getAllowedServerMaxFileSize} from 'app/utils/file';
import {isLandscape} from 'app/selectors/device';

import PostTextbox from './post_textbox';

const MAX_MESSAGE_LENGTH = 4000;

export function mapStateToProps(state, ownProps) {
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
    const enableConfirmNotificationsToChannel = config?.EnableConfirmNotificationsToChannel === 'true';
    const currentChannelStats = getCurrentChannelStats(state);
    const currentChannelMembersCount = currentChannelStats?.member_count || 0; // eslint-disable-line camelcase
    const isTimezoneEnabled = config?.ExperimentalTimezone === 'true';

    let canPost = true;
    let useChannelMentions = true;
    if (isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)) {
        canPost = haveIChannelPermission(
            state,
            {
                channel: currentChannel.id,
                team: currentChannel.team_id,
                permission: Permissions.CREATE_POST,
                default: true,
            },
        );

        useChannelMentions = haveIChannelPermission(
            state,
            {
                channel: currentChannel.id,
                permission: Permissions.USE_CHANNEL_MENTIONS,
                default: true,
            },
        );
    }

    return {
        currentChannel,
        channelId: ownProps.channelId || (currentChannel ? currentChannel.id : ''),
        channelTeamId: currentChannel ? currentChannel.team_id : '',
        canUploadFiles: canUploadFilesOnMobile(state),
        channelDisplayName: state.views.channel.displayName || (currentChannel ? currentChannel.display_name : ''),
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
        enableConfirmNotificationsToChannel,
        currentChannelMembersCount,
        isTimezoneEnabled,
        isLandscape: isLandscape(state),
        canPost,
        useChannelMentions,
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
            getChannelTimezones,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(PostTextbox);
