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
