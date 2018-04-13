// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {Client4} from 'mattermost-redux/client';

import {getTranslations} from 'app/i18n';
import initialState from 'app/initial_state';
import {getCurrentLocale} from 'app/selectors/i18n';
import configureStore from 'app/store';

import {extensionSelectTeamId} from './actions';
import Extension from './extension';

export default class ShareApp extends PureComponent {
    constructor() {
        super();

        this.store = configureStore(initialState);
        this.unsubscribeFromStore = this.store.subscribe(this.listenForHydration);
        this.state = {init: false};
    }

    listenForHydration = () => {
        const {dispatch, getState} = this.store;
        const state = getState();
        if (state.views.root.hydrationComplete) {
            const {credentials} = state.entities.general;
            const {currentTeamId} = state.entities.teams;

            this.unsubscribeFromStore();
            if (credentials.token && credentials.url) {
                Client4.setToken(credentials.token);
                Client4.setUrl(credentials.url);
            }
            extensionSelectTeamId(currentTeamId)(dispatch, getState);
            this.setState({init: true});
        }
    };

    render() {
        if (!this.state.init) {
            return null;
        }

        const locale = getCurrentLocale(this.store.getState());

        return (
            <Provider store={this.store}>
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
