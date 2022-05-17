// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export const SettingOptionConfig = {
    notification: {
        defaultMessage: 'Notifications',
        i18nId: t('user.settings.modal.notifications'),
        iconName: 'bell-outline',
        testID: 'general_settings.notifications.action',
    },
    display: {
        defaultMessage: 'Display',
        i18nId: t('user.settings.modal.display'),
        iconName: 'layers-outline',
        testID: 'general_settings.display.action',
    },
    advanced_settings: {
        defaultMessage: 'Advanced Settings',
        i18nId: t('mobile.advanced_settings.title'),
        iconName: 'tune',
        testID: 'general_settings.advanced.action',
    },
    about: {
        defaultMessage: 'About {appTitle}',
        i18nId: t('about.title'),
        iconName: 'information-outline',
        testID: 'general_settings.about.action',
    },
    help: {
        defaultMessage: 'Help',
        i18nId: t('mobile.help.title'),
        testID: 'general_settings.help.action',
        showArrow: false,
    },
};

export const NotificationsOptionConfig = {
    mentions: {
        iconName: 'at',
        testID: 'notification_settings.mentions_replies.action',
    },
    push_notification: {
        defaultMessage: 'Push Notifications',
        i18nId: t('mobile.notification_settings.mobile'),
        iconName: 'cellphone',
        testID: 'notification_settings.mobile.action',
    },
    automatic_dm_replies: {
        defaultMessage: 'About {appTitle}',
        i18nId: t('about.title'),
        iconName: 'information-outline',
        testID: 'general_settings.about.action',
    },
};
