// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';

import Client from 'client/client_instance.js';
import Config from 'config/config.js';

import Button from './button';
import {Image, StyleSheet, Text, TextInput, View} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import {Actions as Routes} from 'react-native-router-flux';

import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';
import ErrorText from './error_text';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 200,
        backgroundColor: 'white'
    },

    logo: {
        marginBottom: 10
    }
});

class SelectServerView extends Component {
    static propTypes = {
        ping: React.PropTypes.object.isRequired,
        device: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: Config.DefaultServerUrl
        };
    }

    onClick = () => {
        Client.setUrl(this.state.serverUrl);
        Routes.goToLogin();

        // this.props.actions.getPing().then(() => {
        //     AsyncStorage.setItem('serverUrl', this.state.serverUrl, () => {
        //         if (!this.props.ping.error) {
        //             this.props.onProceed();
        //         }
        //     });
        // });
    }

    render() {
        return (
            <View style={styles.container}>
                <Image
                    style={styles.logo}
                    source={logo}
                />
                <Text style={GlobalStyles.label}>{'Enter Server URL'}</Text>
                <TextInput
                    style={GlobalStyles.inputBox}
                    onChangeText={(serverUrl) => this.setState({serverUrl})}
                    onSubmitEditing={this.onClick}
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='url'
                    placeholder='https://mattermost.example.com'
                    returnKeyType='go'
                    value={this.state.serverUrl}
                />
                <Button
                    text='Proceed'
                    onPress={this.onClick}
                    loading={this.props.ping.loading}
                />
                <ErrorText error={this.props.ping.error}/>
                <KeyboardSpacer/>
            </View>
        );
    }
}

export default SelectServerView;
