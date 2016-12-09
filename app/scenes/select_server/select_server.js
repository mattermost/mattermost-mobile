// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {View, TextInput, Image} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';

import Client from 'service/client';
import Button from 'app/components/button';
import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';
import logo from 'app/images/logo.png';

import {injectIntl, intlShape} from 'react-intl';

import RequestStatus from 'service/constants/request_status';

class SelectServer extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        serverUrl: React.PropTypes.string.isRequired,
        server: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired
    };

    onClick = () => {
        Client.setUrl(this.props.serverUrl);

        this.props.actions.getPing().then(() => {
            if (this.props.server.status === RequestStatus.SUCCESS) {
                this.props.actions.goToLogin();
            }
        });
    };

    render() {
        const {formatMessage} = this.props.intl;

        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <FormattedText
                    style={[GlobalStyles.header, GlobalStyles.label]}
                    id='mobile.components.select_server_view.enterServerUrl'
                    defaultMessage='Enter Server URL'
                />
                <TextInput
                    value={this.props.serverUrl}
                    onChangeText={this.props.actions.handleServerUrlChanged}
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
                    loading={this.props.server.loading}
                >
                    <FormattedText
                        id='mobile.components.select_server_view.proceed'
                        defaultMessage='Proceed'
                    />
                </Button>
                <ErrorText error={this.props.server.error}/>
                <KeyboardSpacer/>
            </View>
        );
    }
}

export default injectIntl(SelectServer);
