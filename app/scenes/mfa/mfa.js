// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {TextInput, Image, KeyboardAvoidingView} from 'react-native';

import Button from 'react-native-button';
import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

import RequestStatus from 'service/constants/request_status';

class Mfa extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        loginId: React.PropTypes.string.isRequired,
        password: React.PropTypes.string.isRequired,
        loginRequest: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired
    };

    componentWillMount() {
        this.setState({
            token: '',
            error: null
        });
    }

    componentWillReceiveProps(nextProps) {
        // In case the login is successful the previous scene (login) will take care of the transition
        if (this.props.loginRequest.status === RequestStatus.STARTED &&
            nextProps.loginRequest.status === RequestStatus.FAILURE) {
            this.props.actions.goBack();
        }
    }

    handleInput = (token) => {
        this.setState({
            token,
            error: null
        });
    };

    submit = () => {
        if (!this.state.token) {
            this.setState({
                error: this.props.intl.formatMessage({
                    id: 'login_mfa.tokenReq',
                    defaultMessage: 'Please enter an MFA token'
                })
            });
            return;
        }

        this.props.actions.login(this.props.loginId, this.props.password, this.state.token);
    };

    render() {
        const {formatMessage} = this.props.intl;

        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={[GlobalStyles.container, GlobalStyles.signupContainer]}
            >
                <Image
                    source={logo}
                />
                <FormattedText
                    style={[GlobalStyles.header, GlobalStyles.label]}
                    id='login_mfa.enterToken'
                    defaultMessage="To complete the sign in process, please enter a token from your smartphone's authenticator"
                />
                <ErrorText error={this.state.error}/>
                <TextInput
                    value={this.state.token}
                    onChangeText={this.handleInput}
                    onSubmitEditing={this.submit}
                    style={GlobalStyles.inputBox}
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='numeric'
                    placeholder={formatMessage({id: 'login_mfa.token', defaultMessage: 'MFA Token'})}
                    returnKeyType='go'
                    underlineColorAndroid='transparent'
                />
                <Button
                    onPress={this.submit}
                    loading={false}
                    containerStyle={GlobalStyles.signupButton}
                >
                    <FormattedText
                        style={GlobalStyles.signupButtonText}
                        id='mobile.components.select_server_view.proceed'
                        defaultMessage='Proceed'
                    />
                </Button>
                <KeyboardAvoidingView style={GlobalStyles.pagePush}/>
            </KeyboardAvoidingView>
        );
    }
}

export default injectIntl(Mfa);
