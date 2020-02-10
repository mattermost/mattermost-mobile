// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {getTranslations} from 'app/i18n';
import {getCurrentLocale} from 'app/selectors/i18n';
import store from 'app/store';
import {waitForHydration} from 'app/store/utils';

import {extensionSelectTeamId} from './actions';
let Extension;

export default class ShareApp extends PureComponent {
    constructor() {
        super();

        if (!Extension) {
            Extension = require('./extension').default;
        }

        this.state = {init: false};
    }

    componentDidMount() {
        this.mounted = true;
        waitForHydration(store, () => {
            const {dispatch, getState} = store;
            const {currentTeamId} = getState().entities.teams;
            dispatch(extensionSelectTeamId(currentTeamId));
            this.setState({init: true});
        });
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
