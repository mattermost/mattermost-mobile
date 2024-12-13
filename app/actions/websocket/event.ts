// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as bookmark from '@actions/local/channel_bookmark';
import * as calls from '@calls/connection/websocket_event_handlers';
import {WebsocketEvents} from '@constants';
import * as playbooks from '@playbooks/connection/websocket_event_handlers';

import * as category from './category';
import * as channel from './channel';
import * as group from './group';
import {handleOpenDialogEvent} from './integrations';
import * as posts from './posts';
import * as preferences from './preferences';
import {handleAddCustomEmoji, handleReactionRemovedFromPostEvent, handleReactionAddedToPostEvent} from './reactions';
import {handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent, handleRoleUpdatedEvent} from './roles';
import {handleLicenseChangedEvent, handleConfigChangedEvent} from './system';
import * as teams from './teams';
import {handleThreadUpdatedEvent, handleThreadReadChangedEvent, handleThreadFollowChangedEvent} from './threads';
import {handleUserUpdatedEvent, handleUserTypingEvent, handleStatusChangedEvent} from './users';

export async function handleWebSocketEvent(serverUrl: string, msg: WebSocketMessage) {
    switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:
            posts.handleNewPostEvent(serverUrl, msg);
            break;
        case WebsocketEvents.POST_EDITED:
            posts.handlePostEdited(serverUrl, msg);
            playbooks.handlePostEdited(serverUrl, msg);
            break;
        case WebsocketEvents.POST_DELETED:
            posts.handlePostDeleted(serverUrl, msg);
            playbooks.handlePostDeleted(serverUrl, msg);
            break;
        case WebsocketEvents.POST_UNREAD:
            posts.handlePostUnread(serverUrl, msg);
            break;
        case WebsocketEvents.POST_ACKNOWLEDGEMENT_ADDED:
            posts.handlePostAcknowledgementAdded(serverUrl, msg);
            break;
        case WebsocketEvents.POST_ACKNOWLEDGEMENT_REMOVED:
            posts.handlePostAcknowledgementRemoved(serverUrl, msg);
            break;

        case WebsocketEvents.LEAVE_TEAM:
            teams.handleLeaveTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.UPDATE_TEAM:
            teams.handleUpdateTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ADDED_TO_TEAM:
            teams.handleUserAddedToTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.DELETE_TEAM:
            teams.handleTeamArchived(serverUrl, msg);
            break;
        case WebsocketEvents.RESTORE_TEAM:
            teams.handleTeamRestored(serverUrl, msg);
            break;

        case WebsocketEvents.USER_ADDED:
            channel.handleUserAddedToChannelEvent(serverUrl, msg);
            playbooks.handleWebsocketUserAdded(serverUrl, msg);
            break;
        case WebsocketEvents.USER_REMOVED:
            channel.handleUserRemovedFromChannelEvent(serverUrl, msg);
            playbooks.handleWebsocketUserRemoved(serverUrl, msg);
            break;
        case WebsocketEvents.USER_UPDATED:
            handleUserUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ROLE_UPDATED:
            handleRoleUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.USER_ROLE_UPDATED:
            handleUserRoleUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.MEMBERROLE_UPDATED:
            handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CATEGORY_CREATED:
            category.handleCategoryCreatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_UPDATED:
            category.handleCategoryUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_ORDER_UPDATED:
            category.handleCategoryOrderUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_DELETED:
            category.handleCategoryDeletedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CREATED:
            channel.handleChannelCreatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_DELETED:
            channel.handleChannelDeletedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_UNARCHIVED:
            channel.handleChannelUnarchiveEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_UPDATED:
            channel.handleChannelUpdatedEvent(serverUrl, msg);
            playbooks.handleChannelUpdated(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_CONVERTED:
            channel.handleChannelConvertedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_VIEWED:
            channel.handleChannelViewedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.MULTIPLE_CHANNELS_VIEWED:
            channel.handleMultipleChannelsViewedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:
            channel.handleChannelMemberUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:
            // Do nothing, handled by CHANNEL_UPDATED due to changes in the channel scheme.
            break;
        case WebsocketEvents.DIRECT_ADDED:
        case WebsocketEvents.GROUP_ADDED:
            channel.handleDirectAddedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCE_CHANGED:
            preferences.handlePreferenceChangedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.PREFERENCES_CHANGED:
            preferences.handlePreferencesChangedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.PREFERENCES_DELETED:
            preferences.handlePreferencesDeletedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.STATUS_CHANGED:
            handleStatusChangedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.TYPING:
            handleUserTypingEvent(serverUrl, msg);
            break;

        case WebsocketEvents.REACTION_ADDED:
            handleReactionAddedToPostEvent(serverUrl, msg);
            break;
        case WebsocketEvents.REACTION_REMOVED:
            handleReactionRemovedFromPostEvent(serverUrl, msg);
            break;
        case WebsocketEvents.EMOJI_ADDED:
            handleAddCustomEmoji(serverUrl, msg);
            break;

        case WebsocketEvents.LICENSE_CHANGED:
            handleLicenseChangedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CONFIG_CHANGED:
            handleConfigChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.OPEN_DIALOG:
            handleOpenDialogEvent(serverUrl, msg);
            break;
        case WebsocketEvents.APPS_FRAMEWORK_REFRESH_BINDINGS:
            break;

        case WebsocketEvents.THREAD_UPDATED:
            handleThreadUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.THREAD_READ_CHANGED:
            handleThreadReadChangedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.THREAD_FOLLOW_CHANGED:
            handleThreadFollowChangedEvent(serverUrl, msg);
            break;

        // Calls ws events:
        case WebsocketEvents.CALLS_CHANNEL_ENABLED:
            calls.handleCallChannelEnabled(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CHANNEL_DISABLED:
            calls.handleCallChannelDisabled(serverUrl, msg);
            break;

        // DEPRECATED in favour of user_joined (since v0.21.0)
        case WebsocketEvents.CALLS_USER_CONNECTED:
            calls.handleCallUserConnected(serverUrl, msg);
            break;

        // DEPRECATED in favour of user_left (since v0.21.0)
        case WebsocketEvents.CALLS_USER_DISCONNECTED:
            calls.handleCallUserDisconnected(serverUrl, msg);
            break;

        case WebsocketEvents.CALLS_USER_JOINED:
            calls.handleCallUserJoined(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_LEFT:
            calls.handleCallUserLeft(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_MUTED:
            calls.handleCallUserMuted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_UNMUTED:
            calls.handleCallUserUnmuted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_VOICE_ON:
            calls.handleCallUserVoiceOn(msg);
            break;
        case WebsocketEvents.CALLS_USER_VOICE_OFF:
            calls.handleCallUserVoiceOff(msg);
            break;
        case WebsocketEvents.CALLS_CALL_START:
            calls.handleCallStarted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_SCREEN_ON:
            calls.handleCallScreenOn(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_SCREEN_OFF:
            calls.handleCallScreenOff(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_RAISE_HAND:
            calls.handleCallUserRaiseHand(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_UNRAISE_HAND:
            calls.handleCallUserUnraiseHand(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CALL_END:
            calls.handleCallEnded(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_REACTED:
            calls.handleCallUserReacted(serverUrl, msg);
            break;

        // DEPRECATED in favour of CALLS_JOB_STATE (since v2.15.0)
        case WebsocketEvents.CALLS_RECORDING_STATE:
            calls.handleCallRecordingState(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_JOB_STATE:
            calls.handleCallJobState(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_HOST_CHANGED:
            calls.handleCallHostChanged(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_DISMISSED_NOTIFICATION:
            calls.handleUserDismissedNotification(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CAPTION:
            calls.handleCallCaption(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_HOST_MUTE:
            calls.handleHostMute(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_HOST_LOWER_HAND:
            calls.handleHostLowerHand(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_HOST_REMOVED:
            calls.handleHostRemoved(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CALL_STATE:
            calls.handleCallState(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_RECEIVED:
            group.handleGroupReceivedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_MEMBER_ADD:
            group.handleGroupMemberAddEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_MEMBER_DELETE:
            group.handleGroupMemberDeleteEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_ASSOCIATED_TO_TEAM:
            group.handleGroupTeamAssociatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_DISSOCIATED_TO_TEAM:
            group.handleGroupTeamDissociateEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_ASSOCIATED_TO_CHANNEL:
            break;
        case WebsocketEvents.GROUP_DISSOCIATED_TO_CHANNEL:
            break;

        // Plugins
        case WebsocketEvents.PLUGIN_STATUSES_CHANGED:
        case WebsocketEvents.PLUGIN_ENABLED:
        case WebsocketEvents.PLUGIN_DISABLED:
            // Do nothing, this event doesn't need logic in the mobile app
            break;

        // bookmarks
        case WebsocketEvents.CHANNEL_BOOKMARK_CREATED:
        case WebsocketEvents.CHANNEL_BOOKMARK_DELETED:
            bookmark.handleBookmarkAddedOrDeleted(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_BOOKMARK_UPDATED:
            bookmark.handleBookmarkEdited(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_BOOKMARK_SORTED:
            bookmark.handleBookmarkSorted(serverUrl, msg);
            break;

        // playbooks
        case WebsocketEvents.PLAYBOOKS_PLAYBOOK_RUN_UPDATED:
            playbooks.handlePlaybookRunUpdated(serverUrl, msg);
            break;
        case WebsocketEvents.PLAYBOOKS_PLAYBOOK_RUN_CREATED:
            playbooks.handlePlaybookRunCreated(serverUrl, msg);
            break;
        case WebsocketEvents.PLAYBOOKS_PLAYBOOK_CREATED:
            playbooks.handlePlaybookCreated(serverUrl, msg);
            break;
        case WebsocketEvents.PLAYBOOKS_PLAYBOOK_ARCHIVED:
            playbooks.handlePlaybookArchived(serverUrl, msg);
            break;
        case WebsocketEvents.PLAYBOOKS_PLAYBOOK_RESTORED:
            playbooks.handlePlaybookRestored(serverUrl, msg);
            break;
    }
}
