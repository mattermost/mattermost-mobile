// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';
import {typography} from '@utils/typography';

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

const close = (componentId: string) => popTopScreen(componentId);

export const updateSettings = (componentId: string, settingPromise: Promise<{ error?: unknown; data?: unknown}>) => {
    settingPromise.
        then(({error}) => showSettingSnackBar(error ? 'error' : 'success')).
        catch(() => showSettingSnackBar('error')).
        finally(() => close(componentId));
};

export const showSettingSnackBar = (type: 'success' | 'error') => {
    const snackBarConfig = {
        success: {
            id: t('settings.saved.success'),
            defaultMessage: 'Setting successfully saved',
            iconName: 'link-variant',
            canUndo: false,
            barType: SNACK_BAR_TYPE.SUCCESS,
        },
        error: {
            id: t('settings.saved.error'),
            defaultMessage: 'An error occurred while saving this setting.  Please try again later',
            iconName: 'link-variant',
            canUndo: false, //fixme: should be destructive
            barType: SNACK_BAR_TYPE.ERROR,
        },
    };
    const barType = snackBarConfig[type].barType;
    return showSnackBar({
        snackBarConfig: snackBarConfig[type],
        barType,
    });
};

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
    email: {
        defaultMessage: 'Email',
        i18nId: t('notification_settings.email'),
        iconName: 'email-outline',
        testID: 'notification_settings.email',
    },
    automatic_dm_replies: {
        defaultMessage: 'Automatic replies',
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
