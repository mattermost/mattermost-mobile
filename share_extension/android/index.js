// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {getTranslations} from '@i18n';
import {getCurrentLocale} from '@selectors/i18n';
import configureStore from '@store';
import getStorage from '@store/mmkv_adapter';
import Store from '@store/store';
import {waitForHydration} from '@store/utils';

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
        this.initialize();
    }

    initialize = async () => {
        if (Store.redux) {
            this.hydrate();
            return;
        }

        getStorage().then(this.hydrate);
    };

    hydrate = (MMKVStorage) => {
        if (MMKVStorage) {
            configureStore(MMKVStorage);
        }
        waitForHydration(Store.redux, () => {
            const {dispatch, getState} = Store.redux;
            const {currentTeamId} = getState().entities.teams;
            dispatch(extensionSelectTeamId(currentTeamId));
            this.setState({init: true});
        });
    }

    render() {
        if (!this.state.init) {
            return null;
        }

        const locale = getCurrentLocale(Store.redux.getState());

        return (
            <Provider store={Store.redux}>
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
