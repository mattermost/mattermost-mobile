// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'harmony-reflect';
import React from 'react';
import {Provider} from 'react-redux';

import Root from 'app/components/root';
import Router from 'app/navigation/router';
import configureStore from 'app/store';

import initialState from './initial_state';

const store = configureStore(initialState);

export default class Mattermost extends React.Component {
    state = {
        hydrated: false
    }

    componentWillMount() {
        this.unsubscribeFromStore = store.subscribe(this.listenForHydration);
    }

    // We need to wait for hydration to occur before load the router.
    listenForHydration = () => {
        const state = store.getState();
        if (state.views.root.hydrationComplete) {
            this.unsubscribeFromStore();
            this.setState({
                hydrated: true
            });
        }
    }

    render() {
        if (!this.state.hydrated) {
            return null;
        }

        return (
            <Provider store={store}>
                <Root>
                    <Router/>
                </Root>
            </Provider>
        );
    }
}
