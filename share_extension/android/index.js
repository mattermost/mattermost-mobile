// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {Client4} from 'mattermost-redux/client';

import {getTranslations} from 'app/i18n';
import {getCurrentLocale} from 'app/selectors/i18n';
import {store} from 'app/mattermost';

import {extensionSelectTeamId} from './actions';
import Extension from './extension';

export default class ShareApp extends PureComponent {
    constructor() {
        super();

        const st = store.getState();
        if (st?.views?.root?.hydrationComplete) {
            this.state = {init: true};
            this.listenForHydration();
        } else {
            this.unsubscribeFromStore = store.subscribe(this.listenForHydration);
            this.state = {init: false};
        }
    }

    componentDidMount() {
        this.mounted = true;
    }

    listenForHydration = () => {
        const {dispatch, getState} = store;
        const state = getState();
        if (state.views.root.hydrationComplete) {
            const {currentTeamId} = state.entities.teams;

            if (this.unsubscribeFromStore) {
                this.unsubscribeFromStore();
            }

            this.setCredentialsForClient();

            dispatch(extensionSelectTeamId(currentTeamId));

            if (this.mounted) {
                this.setState({init: true});
            }
        }
    };

    setCredentialsForClient() {
        const state = store.getState();
        const {credentials} = state.entities.general;

        if (credentials.token && credentials.url) {
            Client4.setToken(credentials.token);
            Client4.setUrl(credentials.url);
        }
    }

    render() {
        if (!this.state.init) {
            return null;
        }

        const locale = getCurrentLocale(store.getState());

        return (
            <Provider store={store}>
                <IntlProvider
                    locale={locale}
                    messages={getTranslations(locale)}
                >
                    <Extension/>
                </IntlProvider>
            </Provider>
        );
    }
}
