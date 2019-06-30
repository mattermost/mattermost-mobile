// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SafeAreaView, StatusBar, View, Text, Button} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import ephemeralStore from 'app/store/ephemeral_store';

export default class Test extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getMe: PropTypes.func.isRequired,
        }).isRequired,
        user: PropTypes.object,
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

    render() {
        const {user} = this.props;

        return (
            <SafeAreaView style={{flex: 1, backgroundColor: 'yellow'}}>
                <StatusBar barStyle={'dark-content'}/>
                <View style={{flex: 1, backgroundColor: 'yellow', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Button
                        title={'Fetch My User'}
                        onPress={this.props.actions.getMe}
                    />
                    <Text>{user ? user.fullName : 'No user present'}</Text>
                    <Button
                        title={'Toggle server'}
                        onPress={this.toggle}
                    />
                </View>
            </SafeAreaView>
        );
    }
}
