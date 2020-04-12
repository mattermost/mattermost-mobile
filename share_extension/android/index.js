// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {getTranslations} from '@i18n';
import {getCurrentLocale} from '@selectors/i18n';
import configureStore from '@store';
import EphemeralStore from '@store/ephemeral_store';
import getStorage from '@store/mmkv_adapter';
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
        if (EphemeralStore.reduxStore) {
            this.hydrate();
            return;
        }

        getStorage().then(this.hydrate);
    };

    hydrate = (MMKVStorage) => {
        if (MMKVStorage) {
            configureStore(MMKVStorage);
        }
        waitForHydration(EphemeralStore.reduxStore, () => {
            const {dispatch, getState} = EphemeralStore.reduxStore;
            const {currentTeamId} = getState().entities.teams;
            dispatch(extensionSelectTeamId(currentTeamId));
            this.setState({init: true});
        });
    }

    render() {
        if (!this.state.init) {
            return null;
        }

        const locale = getCurrentLocale(EphemeralStore.reduxStore.getState());

        return (
            <Provider store={EphemeralStore.reduxStore}>
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
