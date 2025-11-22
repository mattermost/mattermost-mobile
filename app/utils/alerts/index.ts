// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {createIntl, defineMessages} from 'react-intl';
import {Alert, Platform, type AlertButton} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {IntuneAuthRequiredReasons} from '@managers/intune_manager/types';
import {queryAllActiveServers} from '@queries/app/servers';
import {getConfigValue} from '@queries/servers/system';
import {logError} from '@utils/log';

export const messages = defineMessages({
    not_secured_vendor_ios: {
        id: 'mobile.managed.not_secured.ios.vendor',
        defaultMessage: 'This device must be secured with biometrics or passcode to use {vendor}.\n\nGo to Settings > Face ID & Passcode.',
    },
    not_secured_vendor_android: {
        id: 'mobile.managed.not_secured.android.vendor',
        defaultMessage: 'This device must be secured with a screen lock to use {vendor}.',
    },
    not_secured_ios: {
        id: 'mobile.managed.not_secured.ios',
        defaultMessage: 'This device must be secured with biometrics or passcode to use Mattermost.\n\nGo to Settings > Face ID & Passcode.',
    },
    not_secured_android: {
        id: 'mobile.managed.not_secured.android',
        defaultMessage: 'This device must be secured with a screen lock to use Mattermost.',
    },
    blocked_by: {
        id: 'mobile.managed.blocked_by',
        defaultMessage: 'Blocked by {vendor}',
    },
    androidSettings: {
        id: 'mobile.managed.settings',
        defaultMessage: 'Go to settings',
    },
    securedBy: {
        id: 'mobile.managed.secured_by',
        defaultMessage: 'Secured by {vendor}',
    },
    logout: {
        id: 'mobile.managed.logout',
        defaultMessage: 'Logout',
    },
    switchServer: {
        id: 'mobile.managed.switch_server',
        defaultMessage: 'Switch server',
    },
    exit: {
        id: 'mobile.managed.exit',
        defaultMessage: 'Exit',
    },
    jailbreak: {
        id: 'mobile.managed.jailbreak',
        defaultMessage: 'Jailbroken or rooted devices are not trusted by {vendor}.',
    },
    biometric_failed: {
        id: 'mobile.managed.biometric_failed',
        defaultMessage: 'Biometric or Passcode authentication failed.',
    },
    retry: {
        id: 'mobile.managed.retry',
        defaultMessage: 'Retry',
    },
    authentication_required_title: {
        id: 'security_manager.authentication_required_title',
        defaultMessage: 'Authentication Required',
    },
    authentication_required_message: {
        id: 'security_manager.authentication_required_message',
        defaultMessage: 'Your organization requires you to sign in again to continue using Intune-managed accounts. The affected accounts have been unenrolled and signed out.',
    },
    consent_denied_title: {
        id: 'security_manager.consent_denied_title',
        defaultMessage: 'Consent Denied',
    },
    consent_denied_message: {
        id: 'security_manager.consent_denied_message',
        defaultMessage: 'You denied consent for Intune management. The affected accounts have been unenrolled and signed out.',
    },
    authentication_failed_title: {
        id: 'security_manager.authentication_failed_title',
        defaultMessage: 'Authentication Failed',
    },
    authentication_failed_message: {
        id: 'security_manager.authentication_failed_message',
        defaultMessage: 'Authentication failed. The affected accounts have been unenrolled and signed out. Please contact your IT administrator.',
    },
    okay: {
        id: 'security_manager.okay',
        defaultMessage: 'Okay',
    },
    access_blocked_title: {
        id: 'security_manager.access_blocked_title',
        defaultMessage: 'Access Blocked',
    },
    access_blocked_message: {
        id: 'security_manager.access_blocked_message',
        defaultMessage: 'Your organization has blocked access to this app. Please contact your IT administrator for assistance.',
    },
    identity_switch_required_title: {
        id: 'security_manager.identity_switch_required_title',
        defaultMessage: 'Identity Switch Required',
    },
    identity_switch_required_message: {
        id: 'security_manager.identity_switch_required_message',
        defaultMessage: 'Your organization requires you to switch accounts to continue using this app. Please contact your IT administrator for assistance.',
    },
    organization: {
        id: 'security_manager.your_organization',
        defaultMessage: 'your organization',
    },
});

/**
 * Switches to the previous server.
 */
const goToPreviousServer = async (lastAccessedServer: string) => {
    // Switch to last accessed server
    if (lastAccessedServer) {
        const theme = Preferences.THEMES.denim;
        const locale = DEFAULT_LOCALE;

        const intl = createIntl({
            locale,
            defaultLocale: DEFAULT_LOCALE,
            messages: getTranslations(locale),
        });
        await switchToServer(lastAccessedServer, theme, intl);
    }
};

/**
 * Builds the alert options for the alert.
 */
export const buildSecurityAlertOptions = async (
    server: string, translations: Record<string, string>,
    callback?: (value: boolean) => void,
    retryCallback?: () => void,
) => {
    const buttons: AlertButton[] = [];
    const hasSessionToServer = await getServerCredentials(server);

    const allServers = await queryAllActiveServers()?.fetch();
    const activeServer = await DatabaseManager.getActiveServerUrl();
    const otherServers = allServers?.filter((s) => s.url !== server).map((s) => s.url) || [];

    if (server && hasSessionToServer) {
        buttons.push({
            text: translations[messages.logout.id],
            style: 'destructive',
            onPress: async () => {
                await logout(server, undefined);
                callback?.(true);
            },
        });
    }

    if (otherServers.length > 0) {
        if (otherServers.length === 1 && otherServers[0] === activeServer) {
            buttons.push({
                text: translations[messages.okay.id],
                style: 'cancel',
                onPress: () => {
                    callback?.(true);
                },
            });
        } else {
            buttons.push({
                text: translations[messages.switchServer.id],
                style: 'cancel',
                onPress: () => {
                    goToPreviousServer(otherServers[0]);
                    callback?.(true);
                },
            });
        }
    }

    if (retryCallback && typeof retryCallback === 'function') {
        buttons.push({
            text: translations[messages.retry.id],
            style: 'default',
            onPress: () => {
                retryCallback();
            },
        });
    }

    if (buttons.length === 0) {
        buttons.push({
            text: translations[messages.exit.id],
            style: 'destructive',
            onPress: () => {
                Emm.exitApp();
            },
        });
    }

    return buttons;
};

/**
 * Shows an alert when the device is not trusted (jailbroken or rooted).
 */
export const showDeviceNotTrustedAlert = async (server: string, siteName: string | undefined, locale?: string) => {
    let serverSiteName;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(server);
        serverSiteName = await getConfigValue(database, 'SiteName');
    } catch (error) {
        logError('showDeviceNotTrustedAlert', error);
    }

    const translations = getTranslations(locale || DEFAULT_LOCALE);
    const buttons = await buildSecurityAlertOptions(server, translations);
    const securedBy = siteName || serverSiteName || 'Mattermost';

    Alert.alert(
        translations[messages.blocked_by.id].replace('{vendor}', securedBy),
        translations[messages.jailbreak.id].
            replace('{vendor}', securedBy),
        buttons,
        {cancelable: false},
    );
};

/**
 * Shows an alert when the device does not have biometrics or passcode set.
 */
export const showNotSecuredAlert = async (server: string, siteName: string | undefined, locale?: string) => {
    const buttons: AlertButton[] = [];
    let serverSiteName;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(server);
        serverSiteName = await getConfigValue(database, 'SiteName');
    } catch (error) {
        logError('showNotSecuredAlert', error);
    }

    const translations = getTranslations(locale || DEFAULT_LOCALE);
    const securedBy = siteName || serverSiteName || 'Mattermost';

    if (Platform.OS === 'android') {
        buttons.push({
            text: translations[messages.androidSettings.id],
            onPress: () => {
                Emm.openSecuritySettings();
            },
        });
    }

    const alertButtons = await buildSecurityAlertOptions(server, translations);
    buttons.push(...alertButtons);

    let message;
    if (serverSiteName || siteName) {
        const key = Platform.select({ios: messages.not_secured_vendor_ios.id, default: messages.not_secured_vendor_android.id});
        message = translations[key].replace('{vendor}', securedBy);
    } else {
        const key = Platform.select({ios: messages.not_secured_ios.id, default: messages.not_secured_android.id});
        message = translations[key];
    }

    Alert.alert(
        translations[messages.blocked_by.id].replace('{vendor}', securedBy),
        message,
        buttons,
        {cancelable: false},
    );
};

/**
 * Shows an alert when biometric authentication fails.
 */
export const showBiometricFailureAlert = async (server: string, blurOnAuthenticate: boolean, siteName: string | undefined, locale?: string, retryCallback?: () => void) => {
    let serverSiteName;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(server);
        serverSiteName = await getConfigValue(database, 'SiteName');
    } catch (error) {
        logError('showBiometricFailureAlert', error);
    }

    const translations = getTranslations(locale || DEFAULT_LOCALE);

    const buttons = await buildSecurityAlertOptions(server, translations, () => {
        if (blurOnAuthenticate) {
            Emm.removeBlurEffect();
        }
    }, retryCallback);
    const securedBy = siteName || serverSiteName || 'Mattermost';

    Alert.alert(
        translations[messages.blocked_by.id].replace('{vendor}', securedBy),
        translations[messages.biometric_failed.id],
        buttons,
        {cancelable: false},
    );
};

export const showBiometricFailureAlertForOrganization = async (server: string, locale?: string, retryCallback?: () => void) => {
    const translations = getTranslations(locale || DEFAULT_LOCALE);
    const organization = translations[messages.organization.id];

    return showBiometricFailureAlert(server, true, organization, locale, retryCallback);
};

/**
 * Shows an alert when authentication is required when Intune fails.
 */
export const showAuthenticationRequiredAlert = async (reason?: string, locale?: string, callback?: () => void) => {
    const translations = getTranslations(locale || DEFAULT_LOCALE);

    // Customize message based on reason
    let title = translations[messages.authentication_required_title.id];
    let message = translations[messages.authentication_required_message.id];

    if (reason === IntuneAuthRequiredReasons.CONSENT_DENIED) {
        title = translations[messages.consent_denied_title.id];
        message = translations[messages.consent_denied_message.id];
    } else if (reason === IntuneAuthRequiredReasons.AUTH_FAILED) {
        title = translations[messages.authentication_failed_title.id];
        message = translations[messages.authentication_failed_message.id];
    }

    Alert.alert(title, message, [{text: translations[messages.okay.id], onPress: callback}], {cancelable: false});
};

/**
 * Shows an alert when Intune conditional access blocks access to the app.
 */
export const showConditionalAccessAlert = async (locale?: string, callback?: () => void) => {
    const translations = getTranslations(locale || DEFAULT_LOCALE);
    Alert.alert(
        translations[messages.access_blocked_title.id],
        translations[messages.access_blocked_message.id],
        [{text: translations[messages.okay.id], onPress: callback}],
        {cancelable: false},
    );
};

/**
 * Shows an alert when Intune requires an identity switch.
 */
export const showIdentitySwitchRequiredAlert = async (locale?: string) => {
    const translations = getTranslations(locale || DEFAULT_LOCALE);
    Alert.alert(
        translations[messages.identity_switch_required_title.id],
        translations[messages.identity_switch_required_message.id],
        [{text: translations[messages.okay.id]}],
        {cancelable: false},
    );
};
