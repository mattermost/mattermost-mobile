// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

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

            dispatch(extensionSelectTeamId(currentTeamId));

            if (this.mounted) {
                this.setState({init: true});
            }
        }
    };

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
