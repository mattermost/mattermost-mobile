// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Button from 'react-native-button';
import {intlShape} from 'react-intl';

import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import {isEmail} from 'mattermost-redux/utils/helpers';

import {GlobalStyles} from 'app/styles';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';

import {changeOpacity} from 'app/utils/theme';

export default class ForgotPassword extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            sendPasswordResetEmail: PropTypes.func.isRequired,
        }),
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null,
            email: '',
            sentPasswordLink: false,
        };
    }

    changeEmail = (email) => {
        this.setState({
            email,
        });
    }

    submitResetPassword = async () => {
        if (!this.state.email || !isEmail(this.state.email)) {
            const {formatMessage} = this.context.intl;
            this.setState({
                error: formatMessage({id: 'password_send.error', defaultMessage: 'Please enter a valid email address.'}),
            });
            return;
        }

        const {data, error} = await this.props.actions.sendPasswordResetEmail(this.state.email);
        if (error) {
            this.setState({error});
        } else if (this.state.error) {
            this.setState({error: ''});
        }
        if (data) {
            this.setState({sentPasswordLink: true});
        }
    }

    emailIdRef = (ref) => {
        this.emailId = ref;
    };

    blur = () => {
        if (this.emailId) {
            this.emailId.blur();
        }
    }

    render() {
        const {formatMessage} = this.context.intl;
        let displayError;
        if (this.state.error) {
            displayError = (
                <ErrorText
                    error={this.state.error}
                    textStyle={style.errorText}
                />
            );
        }

        let passwordFormView;
        if (this.state.sentPasswordLink) {
            passwordFormView = (
                <View style={style.resetSuccessContainer}>
                    <FormattedText
                        style={style.successTxtColor}
                        id='password_send.link'
                        defaultMessage='If the account exists, a password reset email will be sent to:'
                    />
                    <Text style={[style.successTxtColor, style.emailId]}>
                        {this.state.email}
                    </Text>
                    <FormattedText
                        style={[style.successTxtColor, style.defaultTopPadding]}
                        id='password_send.checkInbox'
                        defaultMessage='Please check your inbox.'
                    />
                </View>
            );
        } else {
            passwordFormView = (
                <View>
                    <FormattedText
                        style={[GlobalStyles.subheader, style.defaultTopPadding]}
                        id='password_send.description'
                        defaultMessage='To reset your password, enter the email address you used to sign up'
                    />
                    <TextInput
                        ref={this.emailIdRef}
                        style={GlobalStyles.inputBox}
                        onChangeText={this.changeEmail}
                        placeholder={formatMessage({id: 'login.email', defaultMessage: 'Email'})}
                        placeholderTextColor={changeOpacity('#000', 0.5)}
                        autoCorrect={false}
                        autoCapitalize='none'
                        keyboardType='email-address'
                        underlineColorAndroid='transparent'
                        blurOnSubmit={false}
                        disableFullscreenUI={true}
                    />
                    <Button
                        containerStyle={GlobalStyles.signupButton}
                        disabled={!this.state.email}
                        onPress={this.submitResetPassword}
                    >
                        <FormattedText
                            id='password_send.reset'
                            defaultMessage='Reset my password'
                            style={[GlobalStyles.signupButtonText]}
                        />
                    </Button>
                </View>
            );
        }
        return (
            <View style={style.container}>
                <StatusBar/>
                <TouchableWithoutFeedback
                    onPress={this.blur}
                >
                    <View style={style.innerContainer}>
                        <Image
                            source={require('assets/images/logo.png')}
                        />
                        {displayError}
                        {passwordFormView}
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        flex: 1,
    },
    innerContainer: {
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 50,
    },
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
    resetSuccessContainer: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#dff0d8',
        borderColor: '#d6e9c6',
    },
    emailId: {
        fontWeight: 'bold',
    },
    successTxtColor: {
        color: '#3c763d',
    },
    defaultTopPadding: {
        paddingTop: 15,
    },
});
