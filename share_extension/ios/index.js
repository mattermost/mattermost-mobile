// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {NativeModules} from 'react-native';
import {IntlProvider} from 'react-intl';
import DeviceInfo from 'react-native-device-info';

import Config from 'assets/config';
import {getTranslations} from 'app/i18n';

import {captureExceptionWithoutState, initializeSentry, LOGGER_EXTENSION} from 'app/utils/sentry';

import ErrorMessage from './error_message';
import Extension from './extension';

const ShareExtension = NativeModules.MattermostShare;

export class SharedApp extends PureComponent {
    constructor(props) {
        super(props);

        initializeSentry();

        this.state = {
            hasError: false,
        };
    }

    componentDidCatch(error) {
        this.setState({hasError: true});

        captureExceptionWithoutState(error, LOGGER_EXTENSION);
    }

    close = (data) => {
        ShareExtension.close(data, Config.AppGroupId);
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorMessage close={this.close}/>
            );
        }

        return (
            <Extension
                appGroupId={Config.AppGroupId}
                onClose={this.close}
            />
        );
    }
}

export default function ShareExtensionProvider() {
    const locale = DeviceInfo.getDeviceLocale().split('-')[0];

    return (
        <IntlProvider
            locale={locale}
            messages={getTranslations(locale)}
        >
            <SharedApp/>
        </IntlProvider>
    );
}
