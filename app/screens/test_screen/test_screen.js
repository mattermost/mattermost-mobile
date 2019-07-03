// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SafeAreaView, StatusBar, View, Text, Button} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import ephemeralStore from 'app/store/ephemeral_store';

export default class TestScreen extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadMe: PropTypes.func.isRequired,
        }).isRequired,
        reduxActions: PropTypes.shape({
            handleServerUrlChanged: PropTypes.func.isRequired,
        }),
        fullName: PropTypes.string,
        reduxServerUrl: PropTypes.string,
    };

    constructor(props) {
        super(props);
        this.originalServerUrl = ephemeralStore.currentServerUrl;
    }

    toggle = () => {
        if (ephemeralStore.currentServerUrl.includes('8065')) {
            EventEmitter.emit(NavigationTypes.SWITCH_SERVER, 'http://something');
        } else {
            EventEmitter.emit(NavigationTypes.SWITCH_SERVER, this.originalServerUrl);
        }
    };

    load = async () => {
        this.props.reduxActions.handleServerUrlChanged('http://testing-redux-action');
        await this.props.actions.loadMe();
    };

    render() {
        const {fullName, reduxServerUrl} = this.props;

        return (
            <SafeAreaView style={{flex: 1, backgroundColor: 'yellow'}}>
                <StatusBar barStyle={'dark-content'}/>
                <View style={{flex: 1, backgroundColor: 'yellow', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Button
                        title={'Fetch My User'}
                        onPress={this.load}
                    />
                    <View style={{flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                        <Text>{`Redux stored server url ${reduxServerUrl}`}</Text>
                        <Text>{fullName || 'No user present'}</Text>
                    </View>
                    <Button
                        title={'Toggle server'}
                        onPress={this.toggle}
                    />
                </View>
            </SafeAreaView>
        );
    }
}
