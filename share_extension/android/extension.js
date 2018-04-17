// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, NativeModules} from 'react-native';
import {intlShape} from 'react-intl';

import {captureException, initializeSentry, LOGGER_EXTENSION} from 'app/utils/sentry';

import Navigation from './navigation';

const ShareExtension = NativeModules.MattermostShare;

export default class ShareApp extends PureComponent {
    static contextTypes = {
        intl: intlShape,
        store: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        initializeSentry();
    }

    componentDidCatch(error) {
        const {intl, store} = this.context;
        const {formatMessage} = intl;

        captureException(error, LOGGER_EXTENSION, store);

        Alert.alert(
            formatMessage({
                id: 'mobile.share_extension.error_title',
                defaultMessage: 'Extension Error',
            }),
            formatMessage({
                id: 'mobile.share_extension.error_message',
                defaultMessage: 'An error has occurred while using the share extension.',
            }),
            [
                {
                    text: formatMessage({
                        id: 'mobile.share_extension.error_close',
                        defaultMessage: 'Close',
                    }),
                    onPress: this.close,
                },
            ]
        );
    }

    close = () => ShareExtension.close(null)

    render() {
        return <Navigation/>;
    }
}
