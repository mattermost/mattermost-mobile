// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {IntlShape} from 'react-intl';

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

export const SettingOptionConfig: Record<string, SettingConfigDetails> = {
    notification: {
        defaultMessage: 'Notifications',
        i18nId: t('general_settings.notifications'),
        icon: 'bell-outline',
        testID: 'general_settings.notifications',
    },
    display: {
        defaultMessage: 'Display',
        i18nId: t('general_settings.display'),
        icon: 'layers-outline',
        testID: 'general_settings.display',
    },
    advanced_settings: {
        defaultMessage: 'Advanced Settings',
        i18nId: t('general_settings.advanced_settings'),
        icon: 'tune',
        testID: 'general_settings.advanced',
    },
    about: {
        defaultMessage: 'About {appTitle}',
        i18nId: t('general_settings.about'),
        icon: 'information-outline',
        testID: 'general_settings.about',
    },
    help: {
        defaultMessage: 'Help',
        i18nId: t('general_settings.help'),
        testID: 'general_settings.help',
    },
    report_problem: {
        defaultMessage: 'Report a Problem',
        i18nId: t('general_settings.report_problem'),
        testID: 'general_settings.report_problem',
    },

};

export const NotificationsOptionConfig: Record<string, SettingConfigDetails> = {
    mentions: {
        icon: 'at',
        testID: 'notification_settings.mentions_replies',
    },
    push_notification: {
        defaultMessage: 'Push Notifications',
        i18nId: t('notification_settings.mobile'),
        icon: 'cellphone',
        testID: 'notification_settings.push_notification',
    },
    email: {
        defaultMessage: 'Email',
        i18nId: t('notification_settings.email'),
        icon: 'email-outline',
        testID: 'notification_settings.email',
    },
    automatic_dm_replies: {
        defaultMessage: 'Automatic replies',
        i18nId: t('notification_settings.ooo_auto_responder'),
        icon: 'reply-outline',
        testID: 'notification_settings.automatic_dm_replies',
    },
};

export const DisplayOptionConfig: Record<string, SettingConfigDetails> = {
    clock: {
        defaultMessage: 'Clock Display',
        i18nId: t('mobile.display_settings.clockDisplay'),
        icon: 'clock-outline',
        testID: 'display_settings.clock',
    },
    crt: {
        defaultMessage: 'Collapsed Reply Threads',
        i18nId: t('mobile.display_settings.crt'),
        icon: 'message-text-outline',
        testID: 'display_settings.crt',
    },
    theme: {
        defaultMessage: 'Theme',
        i18nId: t('mobile.display_settings.theme'),
        icon: 'palette-outline',
        testID: 'display_settings.theme',
    },
    timezone: {
        defaultMessage: 'Timezone',
        i18nId: t('mobile.display_settings.timezone'),
        icon: 'globe',
        testID: 'display_settings.timezone',
    },
};

export default {
    ...SettingOptionConfig,
    ...NotificationsOptionConfig,
    ...DisplayOptionConfig,
};
