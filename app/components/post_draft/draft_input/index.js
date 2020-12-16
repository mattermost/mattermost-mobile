// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {executeCommand} from '@actions/views/command';
import {addReactionToLatestPost, addRecentUsedEmojisInMessage} from '@actions/views/emoji';
import {handleClearFiles, handleClearFailedFiles} from '@actions/views/file_upload';
import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {getChannelTimezones, getChannelMemberCountsByGroup} from '@mm-redux/actions/channels';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {createPost} from '@mm-redux/actions/posts';
import {setStatus} from '@mm-redux/actions/users';
import {General, Permissions} from '@mm-redux/constants';
import {getCurrentChannel, getChannel, getChannelStats, getChannelMemberCountsByGroup as selectChannelMemberCountsByGroup} from '@mm-redux/selectors/entities/channels';
import {getConfig, getLicense} from '@mm-redux/selectors/entities/general';
import {getAssociatedGroupsForReferenceMap} from '@mm-redux/selectors/entities/groups';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {getCurrentUserId, getStatusForUserId} from '@mm-redux/selectors/entities/users';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isLandscape} from '@selectors/device';
import {getCurrentChannelDraft, getThreadDraft} from '@selectors/views';

import PostDraft from './draft_input';

export function mapStateToProps(state, ownProps) {
    const channelId = ownProps.channelId;
    const currentDraft = ownProps.rootId ? getThreadDraft(state, ownProps.rootId) : getCurrentChannelDraft(state);
    const config = getConfig(state);
    const channel = ownProps.rootId ? getChannel(state, channelId) : getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);
    const status = getStatusForUserId(state, currentUserId);
    const userIsOutOfOffice = status === General.OUT_OF_OFFICE;
    const enableConfirmNotificationsToChannel = config?.EnableConfirmNotificationsToChannel === 'true';
    const currentChannelStats = getChannelStats(state, channelId);
    const membersCount = currentChannelStats?.member_count || 0; // eslint-disable-line camelcase
    const isTimezoneEnabled = config?.ExperimentalTimezone === 'true';
    const channelTeamId = channel ? channel.team_id : '';
    const license = getLicense(state);
    let useChannelMentions = true;
    let useGroupMentions = false;
    const channelMemberCountsByGroup = selectChannelMemberCountsByGroup(state, channelId);
    let groupsWithAllowReference = new Map();

    if (channel && isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)) {
        useChannelMentions = haveIChannelPermission(
            state,
            {
                channel: channel.id,
                team: channel.team_id,
                permission: Permissions.USE_CHANNEL_MENTIONS,
                default: true,
            },
        );
    }

    if (channel && isMinimumServerVersion(state.entities.general.serverVersion, 5, 24) && license && license.IsLicensed === 'true') {
        useGroupMentions = haveIChannelPermission(
            state,
            {
                channel: channel.id,
                team: channel.team_id,
                permission: Permissions.USE_GROUP_MENTIONS,
                default: true,
            },
        );

        if (useGroupMentions) {
            groupsWithAllowReference = getAssociatedGroupsForReferenceMap(state, channelTeamId, channelId);
        }
    }

    return {
        currentChannel: channel,
        channelId,
        channelTeamId,
        channelDisplayName: state.views.channel.displayName || (channel ? channel.display_name : ''),
        currentUserId,
        enableConfirmNotificationsToChannel,
        files: currentDraft.files,
        isLandscape: isLandscape(state),
        isTimezoneEnabled,
        maxMessageLength: (config && parseInt(config.MaxPostSize || 0, 10)) || MAX_MESSAGE_LENGTH_FALLBACK,
        membersCount,
        theme: getTheme(state),
        useChannelMentions,
        userIsOutOfOffice,
        value: currentDraft.draft,
        groupsWithAllowReference,
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
    handleGotoLocation,
    setStatus,
    getChannelMemberCountsByGroup,
    addRecentUsedEmojisInMessage,
};

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(PostDraft);
