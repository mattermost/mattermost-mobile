// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {defineMessages} from 'react-intl';
import {Alert, Platform, type AlertButton} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getLocalizedMessage} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {IntuneAuthRequiredReasons} from '@managers/intune_manager/types';
import {queryAllActiveServers} from '@queries/app/servers';
import {getConfigValue} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
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
    auth_interrupted_message: {
        id: 'security_manager.auth_interrupted_message',
        defaultMessage: 'Authentication could not be completed. Please try again.',
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
    mam_enrollment_required_title: {
        id: 'security_manager.mam_enrollment_required_title',
        defaultMessage: 'Enrollment Required',
    },
    mam_enrollment_required_message: {
        id: 'security_manager.mam_enrollment_required_message',
        defaultMessage: '{organization} requires enrollment in Microsoft Intune to protect corporate data.',
    },
    mam_enrollment_failed_title: {
        id: 'security_manager.mam_enrollment_failed_title',
        defaultMessage: 'Enrollment Failed',
    },
    mam_enrollment_failed_message: {
        id: 'security_manager.mam_enrollment_failed_message',
        defaultMessage: 'Failed to enroll in Microsoft Intune. You will be logged out.',
    },
    mam_declined_title: {
        id: 'security_manager.mam_declined_title',
        defaultMessage: 'Enrollment Declined',
    },
    mam_declined_message: {
        id: 'security_manager.mam_declined_message',
        defaultMessage: '{organization} requires enrollment in Microsoft Intune. You can retry enrollment or logout.',
    },
    enroll_now: {
        id: 'security_manager.enroll_now',
        defaultMessage: 'Enroll Now',
    },
    cancel: {
        id: 'security_manager.cancel',
        defaultMessage: 'Cancel',
    },
    compliance_not_compliant: {
        id: 'mobile.intune.compliance.not_compliant',
        defaultMessage: "Your device doesn't meet the required app protection policy.",
    },
    compliance_network_failure: {
        id: 'mobile.intune.compliance.network_failure',
        defaultMessage: 'Could not reach the Intune service. Check your network and try again.',
    },
    compliance_service_failure: {
        id: 'mobile.intune.compliance.service_failure',
        defaultMessage: 'Intune service error. Please try again later.',
    },
    compliance_user_cancelled: {
        id: 'mobile.intune.compliance.user_cancelled',
        defaultMessage: 'Login was canceled. Please try again.',
    },
    compliance_alert_title: {
        id: 'mobile.intune.compliance.alert_title',
        defaultMessage: 'App Protection Required',
    },
});

/**
 * Switches to the previous server.
 */
const goToPreviousServer = async (lastAccessedServer: string) => {
    // Switch to last accessed server
    if (lastAccessedServer) {
        await switchToServer(lastAccessedServer);
    }
};

/**
 * Builds the alert options for the alert.
 */
export const buildSecurityAlertOptions = async (
    server: string, locale: string,
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
            text: getLocalizedMessage(locale, messages.logout.id, messages.logout.defaultMessage),
            style: 'destructive',
            onPress: async () => {
                await logout(server, undefined);
                callback?.(true);
            },
        });
    }

    // Without a server every other server matches the filter above, which would offer a
    // managed user a way around the policy that just blocked them.
    if (server && otherServers.length > 0) {
        if (otherServers.length === 1 && otherServers[0] === activeServer) {
            buttons.push({
                text: getLocalizedMessage(locale, messages.okay.id, messages.okay.defaultMessage),
                style: 'cancel',
                onPress: () => {
                    callback?.(true);
                },
            });
        } else {
            buttons.push({
                text: getLocalizedMessage(locale, messages.switchServer.id, messages.switchServer.defaultMessage),
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
            text: getLocalizedMessage(locale, messages.retry.id, messages.retry.defaultMessage),
            style: 'default',
            onPress: () => {
                // Cleanup first, so state from the previous attempt (e.g. blur) does not
                // survive into the retry.
                callback?.(true);
                retryCallback();
            },
        });
    }

    if (buttons.length === 0) {
        buttons.push({
            text: getLocalizedMessage(locale, messages.exit.id, messages.exit.defaultMessage),
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
        logError('showDeviceNotTrustedAlert: failed to get SiteName', getFullErrorMessage(error));
    }

    const resolvedLocale = locale || DEFAULT_LOCALE;
    const buttons = await buildSecurityAlertOptions(server, resolvedLocale);
    const securedBy = siteName || serverSiteName || 'Mattermost';

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.blocked_by.id, messages.blocked_by.defaultMessage).replace('{vendor}', securedBy),
        getLocalizedMessage(resolvedLocale, messages.jailbreak.id, messages.jailbreak.defaultMessage).
            replace('{vendor}', securedBy),
        buttons,
        {cancelable: false},
    );
};

/**
 * Shows an alert when the device does not have biometrics or passcode set.
 */
export const showNotSecuredAlert = async (server: string, siteName: string | undefined, locale?: string, exitOnly = false) => {
    const buttons: AlertButton[] = [];
    let serverSiteName;
    if (server) {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(server);
            serverSiteName = await getConfigValue(database, 'SiteName');
        } catch (error) {
            logError('showNotSecuredAlert: failed to get SiteName', getFullErrorMessage(error));
        }
    }

    const resolvedLocale = locale || DEFAULT_LOCALE;
    const securedBy = siteName || serverSiteName || 'Mattermost';

    let dismiss: () => void;
    const dismissed = new Promise<void>((resolve) => {
        dismiss = resolve;
    });

    if (Platform.OS === 'android') {
        buttons.push({
            text: getLocalizedMessage(resolvedLocale, messages.androidSettings.id, messages.androidSettings.defaultMessage),
            onPress: () => {
                Emm.openSecuritySettings();
                dismiss();
            },
        });
    }

    if (exitOnly) {
        buttons.push({
            text: getLocalizedMessage(resolvedLocale, messages.exit.id, messages.exit.defaultMessage),
            style: 'destructive',
            onPress: () => {
                dismiss();
                Emm.exitApp();
            },
        });
    } else {
        const alertButtons = await buildSecurityAlertOptions(server, resolvedLocale, () => dismiss());
        buttons.push(...alertButtons);
    }

    let message;
    if (serverSiteName || siteName) {
        const descriptor = Platform.select({ios: messages.not_secured_vendor_ios, default: messages.not_secured_vendor_android});
        message = getLocalizedMessage(resolvedLocale, descriptor.id, descriptor.defaultMessage).replace('{vendor}', securedBy);
    } else {
        const descriptor = Platform.select({ios: messages.not_secured_ios, default: messages.not_secured_android});
        message = getLocalizedMessage(resolvedLocale, descriptor.id, descriptor.defaultMessage);
    }

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.blocked_by.id, messages.blocked_by.defaultMessage).replace('{vendor}', securedBy),
        message,
        buttons,
        {cancelable: false},
    );

    return dismissed;
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
        logError('showBiometricFailureAlert: failed to get SiteName', getFullErrorMessage(error));
    }

    const resolvedLocale = locale || DEFAULT_LOCALE;

    let dismiss: () => void;
    const dismissed = new Promise<void>((resolve) => {
        dismiss = resolve;
    });

    const buttons = await buildSecurityAlertOptions(server, resolvedLocale, () => {
        if (blurOnAuthenticate) {
            Emm.removeBlurEffect();
        }
        dismiss();
    }, retryCallback);
    const securedBy = siteName || serverSiteName || 'Mattermost';

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.blocked_by.id, messages.blocked_by.defaultMessage).replace('{vendor}', securedBy),
        getLocalizedMessage(resolvedLocale, messages.biometric_failed.id, messages.biometric_failed.defaultMessage),
        buttons,
        {cancelable: false},
    );

    return dismissed;
};

export const showBiometricFailureAlertForOrganization = async (server: string, locale?: string, retryCallback?: () => void) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    const organization = getLocalizedMessage(resolvedLocale, messages.organization.id, messages.organization.defaultMessage);

    return showBiometricFailureAlert(server, true, organization, locale, retryCallback);
};

/**
 * Shows an alert when authentication could not be attempted or was interrupted.
 *
 * Buttons are built here rather than via buildSecurityAlertOptions so that no destructive
 * option can appear: nobody failed authentication on this path, so the session must survive.
 */
export const showAuthenticationInterruptedAlert = async (server: string, siteName: string | undefined, locale?: string): Promise<'retry' | 'dismiss'> => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    const securedBy = siteName || 'Mattermost';

    const allServers = await queryAllActiveServers()?.fetch();
    const otherServers = allServers?.filter((s) => s.url !== server).map((s) => s.url) || [];

    return new Promise((resolve) => {
        const buttons: AlertButton[] = [];

        if (otherServers.length > 0) {
            buttons.push({
                text: getLocalizedMessage(resolvedLocale, messages.switchServer.id, messages.switchServer.defaultMessage),
                onPress: () => {
                    goToPreviousServer(otherServers[0]);
                    resolve('dismiss');
                },
            });
        }

        buttons.push({
            text: getLocalizedMessage(resolvedLocale, messages.exit.id, messages.exit.defaultMessage),
            style: 'destructive',
            onPress: () => {
                resolve('dismiss');
                Emm.exitApp();
            },
        });

        buttons.push({
            text: getLocalizedMessage(resolvedLocale, messages.retry.id, messages.retry.defaultMessage),
            style: 'default',
            onPress: () => resolve('retry'),
        });

        Alert.alert(
            getLocalizedMessage(resolvedLocale, messages.blocked_by.id, messages.blocked_by.defaultMessage).replace('{vendor}', securedBy),
            getLocalizedMessage(resolvedLocale, messages.auth_interrupted_message.id, messages.auth_interrupted_message.defaultMessage),
            buttons,
            {cancelable: false},
        );
    });
};

/**
 * Shows an alert when authentication is required when Intune fails.
 */
export const showAuthenticationRequiredAlert = async (reason?: string, locale?: string, callback?: () => void) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;

    // Customize message based on reason
    let title = getLocalizedMessage(resolvedLocale, messages.authentication_required_title.id, messages.authentication_required_title.defaultMessage);
    let message = getLocalizedMessage(resolvedLocale, messages.authentication_required_message.id, messages.authentication_required_message.defaultMessage);

    if (reason === IntuneAuthRequiredReasons.CONSENT_DENIED) {
        title = getLocalizedMessage(resolvedLocale, messages.consent_denied_title.id, messages.consent_denied_title.defaultMessage);
        message = getLocalizedMessage(resolvedLocale, messages.consent_denied_message.id, messages.consent_denied_message.defaultMessage);
    } else if (reason === IntuneAuthRequiredReasons.AUTH_FAILED) {
        title = getLocalizedMessage(resolvedLocale, messages.authentication_failed_title.id, messages.authentication_failed_title.defaultMessage);
        message = getLocalizedMessage(resolvedLocale, messages.authentication_failed_message.id, messages.authentication_failed_message.defaultMessage);
    }

    Alert.alert(title, message, [{text: getLocalizedMessage(resolvedLocale, messages.okay.id, messages.okay.defaultMessage), onPress: callback}], {cancelable: false});
};

/**
 * Shows an alert when Intune conditional access blocks access to the app.
 */
export const showConditionalAccessAlert = async (locale?: string, callback?: () => void) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.access_blocked_title.id, messages.access_blocked_title.defaultMessage),
        getLocalizedMessage(resolvedLocale, messages.access_blocked_message.id, messages.access_blocked_message.defaultMessage),
        [{text: getLocalizedMessage(resolvedLocale, messages.okay.id, messages.okay.defaultMessage), onPress: callback}],
        {cancelable: false},
    );
};

/**
 * Shows an alert when Intune requires an identity switch.
 */
export const showIdentitySwitchRequiredAlert = async (locale?: string) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.identity_switch_required_title.id, messages.identity_switch_required_title.defaultMessage),
        getLocalizedMessage(resolvedLocale, messages.identity_switch_required_message.id, messages.identity_switch_required_message.defaultMessage),
        [{text: getLocalizedMessage(resolvedLocale, messages.okay.id, messages.okay.defaultMessage)}],
        {cancelable: false},
    );
};

/**
 * Shows an alert when MAM enrollment is required.
 * User can choose to enroll now or cancel (which logs them out).
 */
export const showMAMEnrollmentRequiredAlert = async (
    siteName: string | undefined,
    locale: string | undefined,
    enrollCallback: () => void,
    cancelCallback: () => void,
) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    const organization = siteName || getLocalizedMessage(resolvedLocale, messages.organization.id, messages.organization.defaultMessage);
    const message = getLocalizedMessage(resolvedLocale, messages.mam_enrollment_required_message.id, messages.mam_enrollment_required_message.defaultMessage).replace('{organization}', organization);

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.mam_enrollment_required_title.id, messages.mam_enrollment_required_title.defaultMessage),
        message,
        [
            {
                text: getLocalizedMessage(resolvedLocale, messages.cancel.id, messages.cancel.defaultMessage),
                style: 'cancel',
                onPress: cancelCallback,
            },
            {
                text: getLocalizedMessage(resolvedLocale, messages.enroll_now.id, messages.enroll_now.defaultMessage),
                style: 'default',
                onPress: enrollCallback,
            },
        ],
        {cancelable: false},
    );
};

/**
 * Shows an alert when MAM enrollment fails.
 * User will be logged out after dismissing the alert.
 */
export const showMAMEnrollmentFailedAlert = async (
    locale?: string,
    callback?: () => void,
) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.mam_enrollment_failed_title.id, messages.mam_enrollment_failed_title.defaultMessage),
        getLocalizedMessage(resolvedLocale, messages.mam_enrollment_failed_message.id, messages.mam_enrollment_failed_message.defaultMessage),
        [{text: getLocalizedMessage(resolvedLocale, messages.okay.id, messages.okay.defaultMessage), onPress: callback}],
        {cancelable: false},
    );
};

/**
 * Shows an alert when user declines MAM enrollment.
 * Provides option to retry enrollment or logout.
 */
export const showMAMDeclinedAlert = async (
    server: string,
    siteName: string | undefined,
    locale: string | undefined,
    callback: (value: boolean) => void,
    retryCallback: () => void,
) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;
    const organization = siteName || getLocalizedMessage(resolvedLocale, messages.organization.id, messages.organization.defaultMessage);
    const message = getLocalizedMessage(resolvedLocale, messages.mam_declined_message.id, messages.mam_declined_message.defaultMessage).replace('{organization}', organization);

    const buttons = await buildSecurityAlertOptions(server, resolvedLocale, callback, retryCallback);

    Alert.alert(
        getLocalizedMessage(resolvedLocale, messages.mam_declined_title.id, messages.mam_declined_title.defaultMessage),
        message,
        buttons,
        {cancelable: false},
    );
};

/**
 * Shows an alert when MAM compliance remediation fails (post-enrollment SDK-triggered check).
 * Uses SDK-provided localized title/message when available, falls back to our own strings.
 */
export const showMAMComplianceFailedAlert = (
    sdkTitle: string,
    sdkMessage: string,
    reason: string,
    locale?: string,
    callback?: () => void,
) => {
    const resolvedLocale = locale || DEFAULT_LOCALE;

    const title = sdkTitle || getLocalizedMessage(resolvedLocale, messages.compliance_alert_title.id, messages.compliance_alert_title.defaultMessage);

    let message = sdkMessage;
    if (!message) {
        switch (reason) {
            case 'not_compliant':
                message = getLocalizedMessage(resolvedLocale, messages.compliance_not_compliant.id, messages.compliance_not_compliant.defaultMessage);
                break;
            case 'network_failure':
                message = getLocalizedMessage(resolvedLocale, messages.compliance_network_failure.id, messages.compliance_network_failure.defaultMessage);
                break;
            case 'service_failure':
                message = getLocalizedMessage(resolvedLocale, messages.compliance_service_failure.id, messages.compliance_service_failure.defaultMessage);
                break;
            case 'user_cancelled':
                message = getLocalizedMessage(resolvedLocale, messages.compliance_user_cancelled.id, messages.compliance_user_cancelled.defaultMessage);
                break;
            default:
                message = getLocalizedMessage(resolvedLocale, messages.compliance_service_failure.id, messages.compliance_service_failure.defaultMessage);
                break;
        }
    }

    Alert.alert(
        title,
        message,
        [{text: getLocalizedMessage(resolvedLocale, messages.okay.id, messages.okay.defaultMessage), onPress: callback}],
        {cancelable: false},
    );
};
