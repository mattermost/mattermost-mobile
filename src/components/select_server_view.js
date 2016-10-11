// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';

import Client from 'actions/client.js';
import {connect} from 'react-redux';
import {getPing} from 'actions/general.js';

import Button from './button.js';
import {AsyncStorage, Image, StyleSheet, Text, TextInput, View} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';

import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';
import ErrorText from './error_text.js';

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
        onProceed: React.PropTypes.func.isRequired,
        getPing: React.PropTypes.func.isRequired,
        ping: React.PropTypes.object.isRequired,
        device: React.PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: 'http://localhost:8065'
        };
    }

    onClick = () => {
        Client.setUrl(this.state.serverUrl);

        this.props.getPing().then(() => {
            AsyncStorage.setItem('serverUrl', this.state.serverUrl, () => {
                if (!this.props.ping.error) {
                    this.props.onProceed();
                }
            });
        });
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
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='url'
                    placeholder='https://mattermost.example.com'
                    returnKeyType='done'
                    defaultValue={this.state.serverUrl}
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

function mapStateToProps(state) {
    return {
        ping: state.entities.general.ping,
        device: state.views.device
    };
}

export default connect(mapStateToProps, {
    getPing
})(SelectServerView);
