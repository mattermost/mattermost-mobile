// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {StyleSheet, Text, View, Image, TextInput} from 'react-native';
import {connect} from 'react-redux';
import KeyboardSpacer from 'react-native-keyboard-spacer';

import {GlobalStyles} from '../styles';
import logo from '../images/logo.png';
import Button from './Button';
import ErrorText from './ErrorText';

import {loadPing} from '../actions/general';
import Client from '../actions/client';

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
        loadPing: React.PropTypes.func.isRequired,
        ping: React.PropTypes.object.isRequired,
        device: React.PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: ''
        };
    }

    onClick = () => {
        Client.setUrl(this.state.serverUrl);
        this.props.loadPing().then(() => {
            //console.log('FOUND IT - AAAAAAAAAAAAAAAAAA ' + this.props.ping.loading);
            //console.log(this.props.ping);
        });

        // Client.getPing(
        //     () => {
        //         AsyncStorage.setItem('serverUrl', this.state.serverUrl, () => {
        //             this.props.onProceed();
        //         });

        //         this.setState({
        //             error: '',
        //             loading: false
        //         });
        //     },
        //     () => {
        //         this.setState({
        //             error: 'The URL does not appear to be a Mattermost Server.  Please check http vs https. You should not include the team name.',
        //             loading: false
        //         });
        //     }
        // );
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
    loadPing
})(SelectServerView);

