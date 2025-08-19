// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';

import {goToScreen} from '@screens/navigation';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

export const getSaveButton = (buttonId: string, intl: IntlShape, color: string) => ({
    color,
    enabled: false,
    id: buttonId,
    showAsAction: 'always' as const,
    testID: 'notification_settings.mentions.save.button',
    text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
    ...typography('Body', 100, 'SemiBold'),
});

export const gotoSettingsScreen = (screen: AvailableScreens, title: string) => {
    const passProps = {};
    const options = {
        topBar: {
            backButton: {
                popStackOnPress: false,
            },
        },
    };
    return goToScreen(screen, title, passProps, options);
};

type SettingConfigDetails = {
        defaultMessage?: string;
        i18nId?: string;
        icon?: string;
        testID?: string;
}

const messages = defineMessages({
    download_logs: {
        defaultMessage: 'Download app logs',
        id: 'general_settings.download_logs',
    },
    report_problem: {
        defaultMessage: 'Report a problem',
        id: 'general_settings.report_problem',
    },
    notifications: {
        defaultMessage: 'Notifications',
        id: 'general_settings.notifications',
    },
    display: {
        defaultMessage: 'Display',
        id: 'general_settings.display',
    },
    advanced_settings: {
        defaultMessage: 'Advanced Settings',
        id: 'general_settings.advanced_settings',
    },
    about: {
        defaultMessage: 'About {appTitle}',
        id: 'general_settings.about',
    },
    help: {
        defaultMessage: 'Help',
        id: 'general_settings.help',
    },
    push_notifications: {
        defaultMessage: 'Push Notifications',
        id: 'notification_settings.mobile',
    },
    call_notifications: {
        defaultMessage: 'Call Notifications',
        id: 'notification_settings.calls',
    },
    email: {
        defaultMessage: 'Email',
        id: 'notification_settings.email',
    },
    automatic_replies: {
        defaultMessage: 'Automatic replies',
        id: 'notification_settings.ooo_auto_responder',
    },
    clock_display: {
        defaultMessage: 'Clock Display',
        id: 'mobile.display_settings.clockDisplay',
    },
    crt: {
        defaultMessage: 'Collapsed Reply Threads',
        id: 'mobile.display_settings.crt',
    },
    theme: {
        defaultMessage: 'Theme',
        id: 'mobile.display_settings.theme',
    },
    timezone: {
        defaultMessage: 'Timezone',
        id: 'mobile.display_settings.timezone',
    },
});

export const SettingOptionConfig: Record<string, SettingConfigDetails> = {
    notification: {
        defaultMessage: messages.notifications.defaultMessage,
        i18nId: messages.notifications.id,
        icon: 'bell-outline',
        testID: messages.notifications.id,
    },
    display: {
        defaultMessage: messages.display.defaultMessage,
        i18nId: messages.display.id,
        icon: 'layers-outline',
        testID: messages.display.id,
    },
    advanced_settings: {
        defaultMessage: messages.advanced_settings.defaultMessage,
        i18nId: messages.advanced_settings.id,
        icon: 'tune',
        testID: messages.advanced_settings.id,
    },
    about: {
        defaultMessage: messages.about.defaultMessage,
        i18nId: messages.about.id,
        icon: 'information-outline',
        testID: messages.about.id,
    },
    help: {
        defaultMessage: messages.help.defaultMessage,
        i18nId: messages.help.id,
        testID: messages.help.id,
    },
    report_problem: {
        defaultMessage: messages.report_problem.defaultMessage,
        i18nId: messages.report_problem.id,
        testID: messages.report_problem.id,
    },
    download_logs: {
        defaultMessage: messages.download_logs.defaultMessage,
        i18nId: messages.download_logs.id,
        testID: messages.download_logs.id,
    },
};

export const NotificationsOptionConfig: Record<string, SettingConfigDetails> = {
    mentions: {
        icon: 'at',
        testID: 'notification_settings.mentions_replies',
    },
    push_notification: {
        defaultMessage: messages.push_notifications.defaultMessage,
        i18nId: messages.push_notifications.id,
        icon: 'cellphone',
        testID: messages.push_notifications.id,
    },
    call_notification: {
        defaultMessage: messages.call_notifications.defaultMessage,
        i18nId: messages.call_notifications.id,
        icon: 'phone-in-talk',
        testID: messages.call_notifications.id,
    },
    email: {
        defaultMessage: messages.email.defaultMessage,
        i18nId: messages.email.id,
        icon: 'email-outline',
        testID: messages.email.id,
    },
    automatic_dm_replies: {
        defaultMessage: messages.automatic_replies.defaultMessage,
        i18nId: messages.automatic_replies.id,
        icon: 'reply-outline',
        testID: messages.automatic_replies.id,
    },
};

export const DisplayOptionConfig: Record<string, SettingConfigDetails> = {
    clock: {
        defaultMessage: messages.clock_display.defaultMessage,
        i18nId: messages.clock_display.id,
        icon: 'clock-outline',
        testID: messages.clock_display.id,
    },
    crt: {
        defaultMessage: messages.crt.defaultMessage,
        i18nId: messages.crt.id,
        icon: 'message-text-outline',
        testID: messages.crt.id,
    },
    theme: {
        defaultMessage: messages.theme.defaultMessage,
        i18nId: messages.theme.id,
        icon: 'palette-outline',
        testID: messages.theme.id,
    },
    timezone: {
        defaultMessage: messages.timezone.defaultMessage,
        i18nId: messages.timezone.id,
        icon: 'globe',
        testID: messages.timezone.id,
    },
};

export default {
    ...SettingOptionConfig,
    ...NotificationsOptionConfig,
    ...DisplayOptionConfig,
};
