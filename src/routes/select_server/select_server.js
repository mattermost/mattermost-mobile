// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {View, TextInput, Image} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import {Actions as Routes} from 'react-native-router-flux';
import _ from 'lodash';

import Client from 'client/client_instance.js';
import Config from 'config/config.js';
import Button from 'components/button';
import ErrorText from 'components/error_text';
import FormattedText from 'components/formatted_text';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';

import {injectIntl, intlShape} from 'react-intl';

class SelectServer extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
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

        this.props.actions.getPing().then(() => {
            if (!this.props.ping.loading && !this.props.ping.error) {
                Routes.goToLogin();
            }
        });
    }

    render() {
        const {formatMessage} = this.props.intl;

        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <FormattedText
                    style={_.at(GlobalStyles, ['header', 'label'])}
                    id='mobile.components.select_server_view.enterServerUrl'
                    defaultMessage='Enter Server URL'
                />
                <TextInput
                    value={this.state.serverUrl}
                    onChangeText={(serverUrl) => this.setState({serverUrl})}
                    onSubmitEditing={this.onClick}
                    style={GlobalStyles.inputBox}
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='url'
                    placeholder={formatMessage({id: 'mobile.components.select_server_view.siteUrlPlaceholder', defaultMessage: 'https://mattermost.example.com'})}
                    returnKeyType='go'
                    underlineColorAndroid='transparent'
                />
                <Button
                    onPress={this.onClick}
                    loading={this.props.ping.loading}
                >
                    <FormattedText
                        id='mobile.components.select_server_view.proceed'
                        defaultMessage='Proceed'
                    />
                </Button>
                <ErrorText error={this.props.ping.error}/>
                <KeyboardSpacer/>
            </View>
        );
    }
}

export default injectIntl(SelectServer);
