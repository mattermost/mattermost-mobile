// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {FlatList, SafeAreaView, StatusBar, View, Text, Button} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import EphemeralStore from 'app/store/ephemeral_store';

import TestItem from './test_item';

export default class TestScreen extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadMe: PropTypes.func.isRequired,
        }).isRequired,
        reduxActions: PropTypes.shape({
            handleServerUrlChanged: PropTypes.func.isRequired,
        }),
        user: PropTypes.object,
        items: PropTypes.array,
        reduxServerUrl: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.originalServerUrl = EphemeralStore.currentServerUrl;
    }

    toggle = () => {
        if (EphemeralStore.currentServerUrl.includes('8065')) {
            EventEmitter.emit(NavigationTypes.SWITCH_SERVER, 'http://something');
        } else {
            EventEmitter.emit(NavigationTypes.SWITCH_SERVER, this.originalServerUrl);
        }
    };

    load = async () => {
        this.props.reduxActions.handleServerUrlChanged('http://testing-redux-action');
        await this.props.actions.loadMe();
    };

    renderItem = ({item}) => {
        return (
            <TestItem
                itemId={item}
                theme={this.props.theme}
                currentUserId={this.props.user.id}
            />
        );
    };

    render() {
        const {user, reduxServerUrl, theme} = this.props;

        return (
            <SafeAreaView style={{flex: 1, backgroundColor: theme.centerChannelBg}}>
                <StatusBar barStyle={'dark-content'}/>
                <View style={{flex: 1, backgroundColor: theme.centerChannelBg, alignItems: 'center', justifyContent: 'space-between'}}>
                    <Button
                        title={'Fetch My User'}
                        onPress={this.load}
                        color={theme.buttonColor}
                    />
                    <View style={{flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{color: theme.centerChannelColor}}>{`Redux stored server url ${reduxServerUrl}`}</Text>
                        <Text style={{color: theme.centerChannelColor}}>{user ? user.fullName : 'No user present'}</Text>
                    </View>
                    <FlatList
                        keyExtractor={(item) => item}
                        data={this.props.items}
                        renderItem={this.renderItem}
                    />
                    <Button
                        title={'Toggle server'}
                        onPress={this.toggle}
                        color={theme.buttonColor}
                    />
                </View>
            </SafeAreaView>
        );
    }
}
