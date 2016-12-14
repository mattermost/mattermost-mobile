// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {getTranslations} from 'service/i18n';
import {IntlProvider} from 'react-intl';

export default class RootLayout extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        locale: React.PropTypes.string.isRequired,
        storage: React.PropTypes.object,
        users: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goToSelectServer: React.PropTypes.func,
            goToSelectTeam: React.PropTypes.func,
            setStoreFromLocalData: React.PropTypes.func
        }).isRequired
    };

    constructor(props) {
        super(props);
        this.alreadyLogged = false;
    }

    componentWillReceiveProps(nextProps) {
        if (!nextProps.storage.token) {
            this.alreadyLogged = true;
            this.props.actions.goToSelectServer();
        } else if (nextProps.storage.token && !nextProps.users.currentId) {
            this.props.actions.setStoreFromLocalData(nextProps.storage);
        } else if (nextProps.users.currentId && !this.alreadyLogged) {
            this.alreadyLogged = true;
            this.props.actions.goToSelectTeam();
        }
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
