// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PLAYBOOKS_SCREENS from '@playbooks/constants/screens';

const ABOUT = 'about';
const ACCOUNT = 'account';
const APPS_FORM = 'apps_form';
const BOTTOM_SHEET = '(bottom_sheet)';
const GENERIC_BOTTOM_SHEET = 'generic_bottom_sheet';
const BROWSE_CHANNELS = '(browse_channels)';
const CALL = 'call';
const CALL_PARTICIPANTS = 'call_participants';
const CALL_HOST_CONTROLS = 'call_host_controls';
const CHANNEL = 'channel';
const CHANNEL_ADD_MEMBERS = 'channel_add_members';
const CHANNEL_BOOKMARK = 'channel_bookmark';
const CHANNEL_FILES = 'channel_files';
const CHANNEL_INFO = '(channel_info)';
const CHANNEL_LIST = 'channel_list';
const CHANNEL_NOTIFICATION_PREFERENCES = 'channel_notification_preferences';
const CODE = 'code';
const CONVERT_GM_TO_CHANNEL = 'convert_gm_to_channel';
const CREATE_DIRECT_MESSAGE = 'create_direct_message';
const CREATE_OR_EDIT_CHANNEL = 'create_or_edit_channel';
const COMPONENT_LIBRARY = 'component_library';
const CUSTOM_STATUS = '(custom_status)';
const CUSTOM_STATUS_CLEAR_AFTER = 'custom_status_clear_after';
const DIALOG_ROUTER = 'dialog_router';
const DRAFT_SCHEDULED_POST_OPTIONS = 'draft_scheduled_post_options';
const EDIT_POST = 'edit_post';
const EDIT_PROFILE = 'edit_profile';
const EDIT_SERVER = 'edit_server';
const EMOJI_PICKER = 'emoji_picker';
const FIND_CHANNELS = 'find_channels';
const FORGOT_PASSWORD = 'forgot_password';
const GALLERY = 'gallery';
const GLOBAL_DRAFTS = 'global_drafts';
const GLOBAL_THREADS = 'global_threads';
const HOME = '(home)';
const INTEGRATION_SELECTOR = 'integration_selector';
const INTERACTIVE_DIALOG = 'interactive_dialog';
const INVITE = 'invite';
const JOIN_TEAM = 'join_team';
const LATEX = 'latex';
const LOGIN = 'login';
const MANAGE_CHANNEL_MEMBERS = 'manage_channel_members';
const MENTIONS = 'mentions';
const MFA = 'mfa';
const ONBOARDING = 'onboarding';
const PDF_VIEWER = 'pdf_viewer';
const PERMALINK = 'permalink';
const PINNED_MESSAGES = 'pinned_messages';
const POST_OPTIONS = 'post_options';
const POST_PRIORITY_PICKER = 'post_priority_picker';
const REACTIONS = 'reactions';
const REPORT_PROBLEM = 'report_problem';
const RESCHEDULE_DRAFT = 'reschedule_draft';
const SAVED_MESSAGES = 'saved_messages';
const SCHEDULED_POST_OPTIONS = 'scheduled_post_options';
const SEARCH = 'search';
const SELECT_TEAM = 'select_team';
const SERVER = 'server';
const SETTINGS = '(settings)';
const SETTINGS_ADVANCED = 'settings_advanced';
const SETTINGS_DISPLAY = 'settings_display';
const SETTINGS_DISPLAY_CLOCK = 'settings_display_clock';
const SETTINGS_DISPLAY_CRT = 'settings_display_crt';
const SETTINGS_DISPLAY_THEME = 'settings_display_theme';
const SETTINGS_DISPLAY_TIMEZONE = 'settings_display_timezone';
const SETTINGS_DISPLAY_TIMEZONE_SELECT = 'settings_display_timezone_select';
const SETTINGS_NOTIFICATION = 'settings_notification';
const SETTINGS_NOTIFICATION_AUTO_RESPONDER = 'settings_notification_auto_responder';
const SETTINGS_NOTIFICATION_EMAIL = 'settings_notification_email';
const SETTINGS_NOTIFICATION_MENTION = 'settings_notification_mention';
const SETTINGS_NOTIFICATION_PUSH = 'settings_notification_push';
const SETTINGS_NOTIFICATION_CALL = 'settings_notification_call';
const SSO = 'sso';
const TABLE = 'table';
const TEAM_SELECTOR_LIST = 'team_selector_list';
const TERMS_OF_SERVICE = 'terms_of_service';
const THREAD = 'thread';
const THREAD_OPTIONS = 'thread_options';
const USER_PROFILE = 'user_profile';

export default {
    ABOUT,
    ACCOUNT,
    APPS_FORM,
    BOTTOM_SHEET,
    BROWSE_CHANNELS,
    CALL,
    CALL_PARTICIPANTS,
    CALL_HOST_CONTROLS,
    CHANNEL,
    CHANNEL_ADD_MEMBERS,
    CHANNEL_BOOKMARK,
    CHANNEL_FILES,
    CHANNEL_INFO,
    CHANNEL_LIST,
    CHANNEL_NOTIFICATION_PREFERENCES,
    CODE,
    CONVERT_GM_TO_CHANNEL,
    COMPONENT_LIBRARY,
    CREATE_DIRECT_MESSAGE,
    CREATE_OR_EDIT_CHANNEL,
    CUSTOM_STATUS,
    CUSTOM_STATUS_CLEAR_AFTER,
    DRAFT_SCHEDULED_POST_OPTIONS,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    EMOJI_PICKER,
    FIND_CHANNELS,
    FORGOT_PASSWORD,
    GALLERY,
    GLOBAL_DRAFTS,
    GLOBAL_THREADS,
    GENERIC_BOTTOM_SHEET,
    HOME,
    INTEGRATION_SELECTOR,
    INTERACTIVE_DIALOG,
    DIALOG_ROUTER,
    INVITE,

    JOIN_TEAM,
    LATEX,
    LOGIN,
    MANAGE_CHANNEL_MEMBERS,
    MENTIONS,
    MFA,
    ONBOARDING,
    PDF_VIEWER,
    PERMALINK,
    PINNED_MESSAGES,
    POST_OPTIONS,
    POST_PRIORITY_PICKER,
    REACTIONS,
    REPORT_PROBLEM,
    RESCHEDULE_DRAFT,
    SAVED_MESSAGES,
    SCHEDULED_POST_OPTIONS,
    SEARCH,
    SELECT_TEAM,
    SERVER,
    SETTINGS,
    SETTINGS_ADVANCED,
    SETTINGS_DISPLAY,
    SETTINGS_DISPLAY_CLOCK,
    SETTINGS_DISPLAY_CRT,
    SETTINGS_DISPLAY_THEME,
    SETTINGS_DISPLAY_TIMEZONE,
    SETTINGS_DISPLAY_TIMEZONE_SELECT,
    SETTINGS_NOTIFICATION,
    SETTINGS_NOTIFICATION_AUTO_RESPONDER,
    SETTINGS_NOTIFICATION_EMAIL,
    SETTINGS_NOTIFICATION_MENTION,
    SETTINGS_NOTIFICATION_PUSH,
    SETTINGS_NOTIFICATION_CALL,
    SSO,
    TABLE,
    TEAM_SELECTOR_LIST,
    TERMS_OF_SERVICE,
    THREAD,
    THREAD_OPTIONS,
    USER_PROFILE,
    ...PLAYBOOKS_SCREENS,
} as const;

export const MODAL_SCREENS = new Set<string>([
    BROWSE_CHANNELS,
    CHANNEL_INFO,
    CHANNEL_ADD_MEMBERS,
    CHANNEL_BOOKMARK,
    CREATE_OR_EDIT_CHANNEL,
    CREATE_DIRECT_MESSAGE,
    CUSTOM_STATUS,
    DIALOG_ROUTER,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    FIND_CHANNELS,
    INTERACTIVE_DIALOG,
    INVITE,
    MANAGE_CHANNEL_MEMBERS,
    PDF_VIEWER,
    RESCHEDULE_DRAFT,
    JOIN_TEAM,
    SETTINGS,
]);

export const SCREENS_AS_BOTTOM_SHEET = new Set<string>([
    BOTTOM_SHEET,
    CALL_PARTICIPANTS,
    CALL_HOST_CONTROLS,
    DRAFT_SCHEDULED_POST_OPTIONS,
    EMOJI_PICKER,
    GALLERY,
    GENERIC_BOTTOM_SHEET,
    POST_OPTIONS,
    POST_PRIORITY_PICKER,
    REACTIONS,
    SCHEDULED_POST_OPTIONS,
    TERMS_OF_SERVICE,
    THREAD_OPTIONS,
    USER_PROFILE,
]);

// Screens that have been migrated to Expo Router
export const UNAUTHENTICATED_SCREENS = new Set<string>([
    ONBOARDING,
    SERVER,
    LOGIN,
    SSO,
    MFA,
    FORGOT_PASSWORD,
]);

export const HOME_TAB_SCREENS = new Set<string>([
    CHANNEL_LIST,
    SEARCH,
    MENTIONS,
    SAVED_MESSAGES,
    ACCOUNT,
]);
