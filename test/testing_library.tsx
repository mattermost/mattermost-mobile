// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import {render} from '@testing-library/react-native';

import intitialState from '@store/initial_state';
import {AnyAction, Store} from 'redux';
import {GlobalState} from '@mm-redux/types/store';

const mockStore = configureMockStore<GlobalState, AnyAction>([thunk]);
const defaultStore = mockStore(intitialState);

export function renderWithIntl(component: React.ReactNode, locale = 'en') {
    return render(
        <IntlProvider locale={locale}>
            {component}
        </IntlProvider>,
    );
}

export function renderWithRedux(component: React.ReactNode, store = defaultStore) {
    return render(
        <Provider store={store}>
            {component}
        </Provider>,
    );
}

export function renderWithReduxIntl(component: React.ReactNode, store: Store<GlobalState, AnyAction> = defaultStore, locale = 'en') {
    return render(
        <Provider store={store}>
            <IntlProvider locale={locale}>
                {component}
            </IntlProvider>
        </Provider>,
    );
}
