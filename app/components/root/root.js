// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {AppState} from 'react-native';
import {getTranslations} from 'service/i18n';
import {IntlProvider} from 'react-intl';

export default class Root extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        locale: React.PropTypes.string.isRequired,
        actions: React.PropTypes.shape({
            setAppState: React.PropTypes.func
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.handleAppStateChange = this.handleAppStateChange.bind(this);

        this.props.actions.setAppState(AppState.currentState === 'active');
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    handleAppStateChange(appState) {
        this.props.actions.setAppState(appState === 'active');
    }

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
