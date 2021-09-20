// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert, AlertButton} from 'react-native';

import ViewTypes from '@constants/view';
import {tryOpenURL} from '@utils/url';

export function unsupportedServer(isSystemAdmin: boolean, intl: IntlShape) {
    if (isSystemAdmin) {
        return unsupportedServerAdminAlert(intl);
    }
    return unsupportedServerAlert(intl);
}

function unsupportedServerAdminAlert(intl: IntlShape) {
    const title = intl.formatMessage({id: 'mobile.server_upgrade.title', defaultMessage: 'Server upgrade required'});

    const message = intl.formatMessage({
        id: 'mobile.server_upgrade.alert_description',
        defaultMessage: 'This server version is unsupported and users will be exposed to compatibility issues that cause crashes or severe bugs breaking core functionality of the app. Upgrading to server version {serverVersion} or later is required.',
    }, {serverVersion: ViewTypes.RequiredServer.FULL_VERSION});

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
