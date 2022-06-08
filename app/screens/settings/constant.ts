// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export const SettingOptionConfig = {
    notification: {
        defaultMessage: 'Notifications',
        i18nId: t('general_settings.notifications'),
        iconName: 'bell-outline',
        testID: 'general_settings.notifications',
    },
    display: {
        defaultMessage: 'Display',
        i18nId: t('general_settings.display'),
        iconName: 'layers-outline',
        testID: 'general_settings.display',
    },
    advanced_settings: {
        defaultMessage: 'Advanced Settings',
        i18nId: t('general_settings.advanced_settings'),
        iconName: 'tune',
        testID: 'general_settings.advanced',
    },
    about: {
        defaultMessage: 'About {appTitle}',
        i18nId: t('general_settings.about'),
        iconName: 'information-outline',
        testID: 'general_settings.about',
    },
    help: {
        defaultMessage: 'Help',
        i18nId: t('general_settings.help'),
        testID: 'general_settings.help',
        showArrow: false,
    },
};

export const NotificationsOptionConfig = {
    mentions: {
        iconName: 'at',
        testID: 'notification_settings.mentions_replies',
    },
    push_notification: {
        defaultMessage: 'Push Notifications',
        i18nId: t('notification_settings.mobile'),
        iconName: 'cellphone',
        testID: 'notification_settings.push_notification',
    },
    automatic_dm_replies: {
        defaultMessage: 'Automatic Direct Message Replies',
        i18nId: t('notification_settings.ooo_auto_responder'),
        iconName: 'reply-outline',
        testID: 'notification_settings.automatic_dm_replies',
    },
};

export const DisplayOptionConfig = {
    clock: {
        defaultMessage: 'Clock Display',
        i18nId: t('mobile.display_settings.clockDisplay'),
        iconName: 'clock-outline',
        testID: 'display_settings.clock',
    },
    theme: {
        defaultMessage: 'Theme',
        i18nId: t('mobile.display_settings.theme'),
        iconName: 'palette-outline',
        testID: 'display_settings.theme',
    },
    timezone: {
        defaultMessage: 'Timezone',
        i18nId: t('mobile.display_settings.timezone'),
        iconName: 'globe',
        testID: 'display_settings.timezone',
    },
};

export default {
    ...SettingOptionConfig,
    ...NotificationsOptionConfig,
    ...DisplayOptionConfig,
};
