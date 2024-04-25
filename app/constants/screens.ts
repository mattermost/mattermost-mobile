// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const ABOUT = 'About';
export const ACCOUNT = 'Account';
export const APPS_FORM = 'AppForm';
export const BOTTOM_SHEET = 'BottomSheet';
export const BROWSE_CHANNELS = 'BrowseChannels';
export const CALL = 'Call';
export const CALL_PARTICIPANTS = 'CallParticipants';
export const CALL_HOST_CONTROLS = 'CallHostControls';
export const CHANNEL = 'Channel';
export const CHANNEL_ADD_MEMBERS = 'ChannelAddMembers';
export const CHANNEL_FILES = 'ChannelFiles';
export const CHANNEL_INFO = 'ChannelInfo';
export const CHANNEL_NOTIFICATION_PREFERENCES = 'ChannelNotificationPreferences';
export const CODE = 'Code';
export const CONVERT_GM_TO_CHANNEL = 'ConvertGMToChannel';
export const CREATE_DIRECT_MESSAGE = 'CreateDirectMessage';
export const CREATE_OR_EDIT_CHANNEL = 'CreateOrEditChannel';
export const CREATE_TEAM = 'CreateTeam';
export const CUSTOM_STATUS = 'CustomStatus';
export const CUSTOM_STATUS_CLEAR_AFTER = 'CustomStatusClearAfter';
export const EDIT_POST = 'EditPost';
export const EDIT_PROFILE = 'EditProfile';
export const EDIT_SERVER = 'EditServer';
export const EMOJI_PICKER = 'EmojiPicker';
export const FIND_CHANNELS = 'FindChannels';
export const FORGOT_PASSWORD = 'ForgotPassword';
export const GALLERY = 'Gallery';
export const GLOBAL_THREADS = 'GlobalThreads';
export const HOME = 'Home';
export const INTEGRATION_SELECTOR = 'IntegrationSelector';
export const INTERACTIVE_DIALOG = 'InteractiveDialog';
export const INVITE = 'Invite';
export const IN_APP_NOTIFICATION = 'InAppNotification';
export const JOIN_TEAM = 'JoinTeam';
export const LATEX = 'Latex';
export const LOGIN = 'Login';
export const MANAGE_CHANNEL_MEMBERS = 'ManageChannelMembers';
export const MENTIONS = 'Mentions';
export const MFA = 'MFA';
export const ONBOARDING = 'Onboarding';
export const PERMALINK = 'Permalink';
export const PINNED_MESSAGES = 'PinnedMessages';
export const POST_OPTIONS = 'PostOptions';
export const POST_PRIORITY_PICKER = 'PostPriorityPicker';
export const REACTIONS = 'Reactions';
export const REVIEW_APP = 'ReviewApp';
export const SAVED_MESSAGES = 'SavedMessages';
export const SEARCH = 'Search';
export const SELECT_TEAM = 'SelectTeam';
export const SERVER = 'Server';
export const SETTINGS = 'Settings';
export const SETTINGS_ADVANCED = 'SettingsAdvanced';
export const SETTINGS_DISPLAY = 'SettingsDisplay';
export const SETTINGS_DISPLAY_CLOCK = 'SettingsDisplayClock';
export const SETTINGS_DISPLAY_CRT = 'SettingsDisplayCRT';
export const SETTINGS_DISPLAY_THEME = 'SettingsDisplayTheme';
export const SETTINGS_DISPLAY_TIMEZONE = 'SettingsDisplayTimezone';
export const SETTINGS_DISPLAY_TIMEZONE_SELECT = 'SettingsDisplayTimezoneSelect';
export const SETTINGS_NOTIFICATION = 'SettingsNotification';
export const SETTINGS_NOTIFICATION_AUTO_RESPONDER = 'SettingsNotificationAutoResponder';
export const SETTINGS_NOTIFICATION_EMAIL = 'SettingsNotificationEmail';
export const SETTINGS_NOTIFICATION_MENTION = 'SettingsNotificationMention';
export const SETTINGS_NOTIFICATION_PUSH = 'SettingsNotificationPush';
export const SHARE_FEEDBACK = 'ShareFeedback';
export const SNACK_BAR = 'SnackBar';
export const SSO = 'SSO';
export const TABLE = 'Table';
export const TEAM_SELECTOR_LIST = 'TeamSelectorList';
export const TERMS_OF_SERVICE = 'TermsOfService';
export const THREAD = 'Thread';
export const THREAD_FOLLOW_BUTTON = 'ThreadFollowButton';
export const THREAD_OPTIONS = 'ThreadOptions';
export const USER_PROFILE = 'UserProfile';

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
    CHANNEL_FILES,
    CHANNEL_INFO,
    CHANNEL_NOTIFICATION_PREFERENCES,
    CODE,
    CONVERT_GM_TO_CHANNEL,
    CREATE_DIRECT_MESSAGE,
    CREATE_OR_EDIT_CHANNEL,
    CREATE_TEAM,
    CUSTOM_STATUS,
    CUSTOM_STATUS_CLEAR_AFTER,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    EMOJI_PICKER,
    FIND_CHANNELS,
    FORGOT_PASSWORD,
    GALLERY,
    GLOBAL_THREADS,
    HOME,
    INTEGRATION_SELECTOR,
    INTERACTIVE_DIALOG,
    INVITE,
    IN_APP_NOTIFICATION,
    JOIN_TEAM,
    LATEX,
    LOGIN,
    MANAGE_CHANNEL_MEMBERS,
    MENTIONS,
    MFA,
    ONBOARDING,
    PERMALINK,
    PINNED_MESSAGES,
    POST_OPTIONS,
    POST_PRIORITY_PICKER,
    REACTIONS,
    REVIEW_APP,
    SAVED_MESSAGES,
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
    SHARE_FEEDBACK,
    SNACK_BAR,
    SSO,
    TABLE,
    TEAM_SELECTOR_LIST,
    TERMS_OF_SERVICE,
    THREAD,
    THREAD_FOLLOW_BUTTON,
    THREAD_OPTIONS,
    USER_PROFILE,
} as const;

export const MODAL_SCREENS_WITHOUT_BACK = new Set<string>([
    BROWSE_CHANNELS,
    CHANNEL_INFO,
    CHANNEL_ADD_MEMBERS,
    CREATE_DIRECT_MESSAGE,
    CREATE_TEAM,
    CUSTOM_STATUS,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    FIND_CHANNELS,
    GALLERY,
    MANAGE_CHANNEL_MEMBERS,
    INVITE,
    PERMALINK,
]);

export const SCREENS_WITH_TRANSPARENT_BACKGROUND = new Set<string>([
    PERMALINK,
    REVIEW_APP,
    SNACK_BAR,
]);

export const SCREENS_AS_BOTTOM_SHEET = new Set<string>([
    BOTTOM_SHEET,
    EMOJI_PICKER,
    POST_OPTIONS,
    POST_PRIORITY_PICKER,
    THREAD_OPTIONS,
    REACTIONS,
    USER_PROFILE,
    CALL_PARTICIPANTS,
    CALL_HOST_CONTROLS,
]);

export const NOT_READY = [
    CREATE_TEAM,
];
