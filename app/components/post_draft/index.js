// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {General, Permissions} from '@mm-redux/constants';
import {createPost} from '@mm-redux/actions/posts';
import {setStatus} from '@mm-redux/actions/users';
import {getCurrentChannel, isCurrentChannelReadOnly, getCurrentChannelStats, getChannelMemberCountsByGroup as selectChannelMemberCountsByGroup} from '@mm-redux/selectors/entities/channels';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {canUploadFilesOnMobile, getConfig, getLicense} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, getStatusForUserId} from '@mm-redux/selectors/entities/users';
import {getChannelTimezones, getChannelMemberCountsByGroup} from '@mm-redux/actions/channels';
import {getAssociatedGroupsForReferenceMap} from '@mm-redux/selectors/entities/groups';

import {executeCommand} from '@actions/views/command';
import {addReactionToLatestPost} from '@actions/views/emoji';
import {handleClearFiles, handleClearFailedFiles, initUploadFiles} from '@actions/views/file_upload';
import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {getCurrentChannelDraft, getThreadDraft} from '@selectors/views';
import {getChannelMembersForDm} from '@selectors/channel';
import {getAllowedServerMaxFileSize} from '@utils/file';
import {isLandscape} from '@selectors/device';

import PostDraft from './post_draft';

export function mapStateToProps(state, ownProps) {
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);
    const config = getConfig(state);
    const currentChannel = getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);
    const status = getStatusForUserId(state, currentUserId);
    const userIsOutOfOffice = status === General.OUT_OF_OFFICE;
    const enableConfirmNotificationsToChannel = config?.EnableConfirmNotificationsToChannel === 'true';
    const currentChannelStats = getCurrentChannelStats(state);
    const membersCount = currentChannelStats?.member_count || 0; // eslint-disable-line camelcase
    const isTimezoneEnabled = config?.ExperimentalTimezone === 'true';
    const channelId = ownProps.channelId || (currentChannel ? currentChannel.id : '');
    const channelTeamId = currentChannel ? currentChannel.team_id : '';
    const license = getLicense(state);
    let canPost = true;
    let useChannelMentions = true;
    let deactivatedChannel = false;
    let useGroupMentions = false;
    const channelMemberCountsByGroup = selectChannelMemberCountsByGroup(state, channelId);

    if (currentChannel && currentChannel.type === General.DM_CHANNEL) {
        const teammate = getChannelMembersForDm(state, currentChannel);
        if (teammate.length && teammate[0].delete_at) {
            deactivatedChannel = true;
        }
    }

    if (currentChannel && isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)) {
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

    if (isMinimumServerVersion(state.entities.general.serverVersion, 5, 22) && license && license.IsLicensed === 'true') {
        useGroupMentions = haveIChannelPermission(
            state,
            {
                channel: currentChannel.id,
                team: currentChannel.team_id,
                permission: Permissions.USE_GROUP_MENTIONS,
            },
        );
    }

    return {
        canPost,
        currentChannel,
        channelId,
        channelTeamId,
        canUploadFiles: canUploadFilesOnMobile(state),
        channelDisplayName: state.views.channel.displayName || (currentChannel ? currentChannel.display_name : ''),
        channelIsArchived: ownProps.channelIsArchived || (currentChannel ? currentChannel.delete_at !== 0 : false),
        channelIsReadOnly: isCurrentChannelReadOnly(state) || false,
        currentUserId,
        deactivatedChannel,
        enableConfirmNotificationsToChannel,
        files: currentDraft.files,
        isLandscape: isLandscape(state),
        isTimezoneEnabled,
        maxMessageLength: (config && parseInt(config.MaxPostSize || 0, 10)) || MAX_MESSAGE_LENGTH_FALLBACK,
        maxFileSize: getAllowedServerMaxFileSize(config),
        membersCount,
        theme: getTheme(state),
        useChannelMentions,
        userIsOutOfOffice,
        value: currentDraft.draft,
        groupsWithAllowReference: getAssociatedGroupsForReferenceMap(state, channelTeamId, channelId),
        useGroupMentions,
        channelMemberCountsByGroup,
    };
}

const mapDispatchToProps = {
    addReactionToLatestPost,
    createPost,
    executeCommand,
    getChannelTimezones,
    handleClearFiles,
    handleClearFailedFiles,
    initUploadFiles,
    setStatus,
    getChannelMemberCountsByGroup,
};

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(PostDraft);
