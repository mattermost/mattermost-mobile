// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {AppState} from 'react-native';
import {IntlProvider} from 'react-intl';
import {Constants} from 'service/constants';
import {getTranslations} from 'service/i18n';
import EventEmitter from 'service/utils/event_emitter';

export default class Root extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        locale: React.PropTypes.string.isRequired,
        actions: React.PropTypes.shape({
            loadConfigAndLicense: React.PropTypes.func.isRequired,
            setAppState: React.PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.handleAppStateChange = this.handleAppStateChange.bind(this);

        this.props.actions.setAppState(AppState.currentState === 'active');
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(Constants.CONFIG_CHANGED, this.handleConfigChanged);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
        EventEmitter.off(Constants.CONFIG_CHANGED, this.handleConfigChanged);
    }

    handleAppStateChange(appState) {
        this.props.actions.setAppState(appState === 'active');
    }

    handleConfigChanged = (serverVersion) => {
        this.props.actions.loadConfigAndLicense(serverVersion);
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                {this.props.children}
            </IntlProvider>
        );
    }
}
