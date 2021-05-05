// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Channel} from './channels';
import {Team} from './teams';
import {PostType} from './posts';
import {$ID, IDMappedObjects, RelationOneToMany, RelationOneToOne, Dictionary} from './utilities';
import {localizeMessage} from '@mm-redux/utils/i18n_utils';
export type UserNotifyProps = {
    auto_responder_active?: 'true' | 'false';
    auto_responder_message?: string;
    desktop: 'default' | 'all' | 'mention' | 'none';
    desktop_notification_sound?: string;
    desktop_sound: 'true' | 'false';
    email: 'true' | 'false';
    mark_unread: 'all' | 'mention';
    push: 'default' | 'all' | 'mention' | 'none';
    push_status: 'ooo' | 'offline' | 'away' | 'dnd' | 'online';
    comments: 'never' | 'root' | 'any';
    first_name: 'true' | 'false';
    channel: 'true' | 'false';
    mention_keys: string;
    user_id?: string;
};
export type UserProfile = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    username: string;
    auth_data: string;
    auth_service: string;
    email: string;
    email_verified: boolean;
    nickname: string;
    first_name: string;
    last_name: string;
    position: string;
    roles: string;
    locale: string;
    props: Dictionary<string>;
    notify_props: UserNotifyProps;
    terms_of_service_id: string;
    terms_of_service_create_at: number;
    timezone?: UserTimezone;
    is_bot: boolean;
    last_picture_update: number;
};
export type UsersState = {
    currentUserId: string;
    isManualStatus: RelationOneToOne<UserProfile, boolean>;
    mySessions: Array<any>;
    profiles: IDMappedObjects<UserProfile>;
    profilesInTeam: RelationOneToMany<Team, UserProfile>;
    profilesNotInTeam: RelationOneToMany<Team, UserProfile>;
    profilesWithoutTeam: Set<string>;
    profilesInChannel: RelationOneToMany<Channel, UserProfile>;
    profilesNotInChannel: RelationOneToMany<Channel, UserProfile>;
    statuses: RelationOneToOne<UserProfile, string>;
    stats: any;
};
export type UserTimezone = {
    useAutomaticTimezone: boolean | string;
    automaticTimezone: string;
    manualTimezone: string;
};
export type UserActivity = {
    [x in PostType]: {
        [y in $ID<UserProfile>]: | {
            ids: Array<$ID<UserProfile>>;
            usernames: Array<UserProfile['username']>;
        } | Array<$ID<UserProfile>>;
    };
};

export type UserStatus = {
	user_id: string;
	status: string;
	manual: boolean;
	last_activity_at: number;
	active_channel?: string;
}

export enum CustomStatusDuration {
    DONT_CLEAR = 'dont_clear',
    THIRTY_MINUTES = 'thirty_minutes',
    ONE_HOUR = 'one_hour',
    FOUR_HOURS = 'four_hours',
    TODAY = 'today',
    THIS_WEEK = 'this_week',
    DATE_AND_TIME = 'date_and_time',
}

export type UserCustomStatus = {
    emoji: string;
    text: string;
    expires_at?: string;
    duration: CustomStatusDuration;
}

export type ExpiryMenuItem = {
    text: string;
    value: string;
}

const {
    DONT_CLEAR,
    THIRTY_MINUTES,
    ONE_HOUR,
    FOUR_HOURS,
    TODAY,
    THIS_WEEK,
    DATE_AND_TIME,
} = CustomStatusDuration;

export const ExpiryMenuItems: { [key: string]: ExpiryMenuItem } = {
    [DONT_CLEAR]: {
        text: localizeMessage('expiry_dropdown.dont_clear', "Don't clear"),
        value: localizeMessage('expiry_dropdown.dont_clear', "Don't clear"),
    },
    [THIRTY_MINUTES]: {
        text: localizeMessage('expiry_dropdown.thirty_minutes', '30 minutes'),
        value: localizeMessage('expiry_dropdown.thirty_minutes', '30 minutes'),
    },
    [ONE_HOUR]: {
        text: localizeMessage('expiry_dropdown.one_hour', '1 hour'),
        value: localizeMessage('expiry_dropdown.one_hour', '1 hour'),
    },
    [FOUR_HOURS]: {
        text: localizeMessage('expiry_dropdown.four_hours', '4 hours'),
        value: localizeMessage('expiry_dropdown.four_hours', '4 hours'),
    },
    [TODAY]: {
        text: localizeMessage('expiry_dropdown.today', 'Today'),
        value: localizeMessage('expiry_dropdown.today', 'Today'),
    },
    [THIS_WEEK]: {
        text: localizeMessage('expiry_dropdown.this_week', 'This week'),
        value: localizeMessage('expiry_dropdown.this_week', 'This week'),
    },
    [DATE_AND_TIME]: {
        text: localizeMessage('expiry_dropdown.choose_date_and_time', 'Custom'),
        value: localizeMessage('expiry_dropdown.date_and_time', 'Date and Time'),
    },
};
