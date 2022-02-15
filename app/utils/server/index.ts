// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert, AlertButton} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Screens, SupportedServer} from '@constants';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {LaunchType} from '@typings/launch';
import {changeOpacity} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

export function unsupportedServer(isSystemAdmin: boolean, intl: IntlShape) {
    if (isSystemAdmin) {
        return unsupportedServerAdminAlert(intl);
    }
    return unsupportedServerAlert(intl);
}

export function semverFromServerVersion(value: string) {
    if (!value || typeof value !== 'string') {
        return undefined;
    }

    const split = value.split('.');

    const major = parseInt(split[0], 10);
    const minor = parseInt(split[1] || '0', 10);
    const patch = parseInt(split[2] || '0', 10);

    return `${major}.${minor}.${patch}`;
}

export async function addNewServer(theme: Theme, serverUrl?: string, displayName?: string) {
    await dismissBottomSheet();
    const closeButton = CompassIcon.getImageSourceSync('close', 24, changeOpacity(theme.centerChannelColor, 0.56));
    const closeButtonId = 'close-server';
    const props = {
        closeButtonId,
        displayName,
        launchType: LaunchType.AddServer,
        serverUrl,
        theme,
    };
    const options = {
        layout: {
            backgroundColor: theme.centerChannelBg,
            componentBackgroundColor: theme.centerChannelBg,
        },
        modal: {swipeToDismiss: false},
        topBar: {
            visible: true,
            drawBehind: true,
            translucient: true,
            noBorder: true,
            elevation: 0,
            background: {color: 'transparent'},
            leftButtons: [{
                id: closeButtonId,
                icon: closeButton,
                testID: 'close.server.button',
            }],
            leftButtonColor: undefined,
            title: {color: theme.sidebarHeaderTextColor},
            scrollEdgeAppearance: {
                active: true,
                noBorder: true,
                translucid: true,
            },
        },
    };

    showModal(Screens.SERVER, '', props, options);
}

export async function alertServerLogout(displayName: string, onPress: () => void, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'server.logout.alert_title',
            defaultMessage: 'Are you sure you want to log out of {displayName}?',
        }, {displayName}),
        intl.formatMessage({
            id: 'server.logout.alert_description',
            defaultMessage: 'All associated data will be removed',
        }),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
        }, {
            style: 'destructive',
            text: intl.formatMessage({id: 'servers.logout', defaultMessage: 'Log out'}),
            onPress,
        }],
    );
}

export async function alertServerRemove(displayName: string, onPress: () => void, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'server.remove.alert_title',
            defaultMessage: 'Are you sure you want to remove {displayName}?',
        }, {displayName}),
        intl.formatMessage({
            id: 'server.remove.alert_description',
            defaultMessage: 'This will remove it from your list of servers. All associated data will be removed',
        }),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
        }, {
            style: 'destructive',
            text: intl.formatMessage({id: 'servers.remove', defaultMessage: 'Remove'}),
            onPress,
        }],
    );
}

function unsupportedServerAdminAlert(intl: IntlShape) {
    const title = intl.formatMessage({id: 'mobile.server_upgrade.title', defaultMessage: 'Server upgrade required'});

    const message = intl.formatMessage({
        id: 'mobile.server_upgrade.alert_description',
        defaultMessage: 'This server version is unsupported and users will be exposed to compatibility issues that cause crashes or severe bugs breaking core functionality of the app. Upgrading to server version {serverVersion} or later is required.',
    }, {serverVersion: SupportedServer.FULL_VERSION});

    const cancel: AlertButton = {
        text: intl.formatMessage({id: 'mobile.server_upgrade.dismiss', defaultMessage: 'Dismiss'}),
        style: 'default',
    };

    const learnMore: AlertButton = {
        text: intl.formatMessage({id: 'mobile.server_upgrade.learn_more', defaultMessage: 'Learn More'}),
        style: 'cancel',
        onPress: () => {
            const url = 'https://docs.mattermost.com/administration/release-lifecycle.html';
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'mobile.link.error.text', defaultMessage: 'Unable to open the link.'}),
                );
            };

            tryOpenURL(url, onError);
        },
    };
    const buttons: AlertButton[] = [cancel, learnMore];
    const options = {cancelable: false};

    Alert.alert(title, message, buttons, options);
}

function unsupportedServerAlert(intl: IntlShape) {
    const title = intl.formatMessage({id: 'mobile.unsupported_server.title', defaultMessage: 'Unsupported server version'});

    const message = intl.formatMessage({
        id: 'mobile.unsupported_server.message',
        defaultMessage: 'Attachments, link previews, reactions and embed data may not be displayed correctly. If this issue persists contact your System Administrator to upgrade your Mattermost server.',
    });

    const okButton: AlertButton = {
        text: intl.formatMessage({id: 'mobile.unsupported_server.ok', defaultMessage: 'OK'}),
        style: 'default',
    };

    const buttons: AlertButton[] = [okButton];
    const options = {cancelable: false};

    Alert.alert(title, message, buttons, options);
}
