// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {RealmProvider} from 'realm-react-redux';
import {Provider} from 'react-redux';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import Root from 'app/components/root';
import {NavigationTypes} from 'app/constants';
import {configureRealmStore} from 'app/store';
import ephemeralStore from 'app/store/ephemeral_store';
import options from 'app/store/realm_context_options';

export default class ScreenWrapper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        excludeEvents: PropTypes.bool,
        store: PropTypes.object.isRequired,
    };

    static defaultProps = {
        excludeEvents: false,
    };

    constructor(props) {
        super(props);

        this.state = {
            realm: this.getRealmStoreForCurrentServer(),
        };
    }

    componentDidMount() {
        EventEmitter.on(NavigationTypes.SWITCH_SERVER, this.switchServer);
    }

    componentWillUnmount() {
        EventEmitter.off(NavigationTypes.SWITCH_SERVER, this.switchServer);
    }

    getRealmStoreForCurrentServer = () => {
        let realm = ephemeralStore.getRealmStoreByServer(ephemeralStore.currentServerUrl);
        if (!realm) {
            realm = configureRealmStore(ephemeralStore.currentServerUrl);
            ephemeralStore.setRealmStoreByServer(ephemeralStore.currentServerUrl, realm);
        }

        return realm;
    };

    switchServer = (url) => {
        ephemeralStore.currentServerUrl = url;
        this.setState({
            realm: this.getRealmStoreForCurrentServer(),
        });
    };

    render() {
        const {children, excludeEvents, store} = this.props;
        const {realm} = this.state;

        return (
            <RealmProvider
                store={realm}
                context={options.context}
            >
                <Provider
                    store={store}
                >
                    <Root
                        excludeEvents={excludeEvents}
                    >
                        {children}
                    </Root>
                </Provider>
            </RealmProvider>
        );
    }
}
