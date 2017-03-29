// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Button from 'react-native-button';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

import RequestStatus from 'mattermost-redux/constants/request_status';

export default class Mfa extends Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            goBack: React.PropTypes.func.isRequired,
            login: React.PropTypes.func.isRequired
        }).isRequired,
        loginId: React.PropTypes.string.isRequired,
        password: React.PropTypes.string.isRequired,
        loginRequest: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            token: '',
            error: null
        };
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        // In case the login is successful the previous scene (login) will take care of the transition
        if (this.props.loginRequest.status === RequestStatus.STARTED &&
            nextProps.loginRequest.status === RequestStatus.FAILURE) {
            this.props.actions.goBack();
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    handleAndroidKeyboard = () => {
        this.blur();
    };

    handleInput = (token) => {
        this.setState({
            token,
            error: null
        });
    };

    inputRef = (ref) => {
        this.textInput = ref;
    };

    blur = () => {
        this.textInput.refs.wrappedInstance.blur();
    };

    submit = () => {
        Keyboard.dismiss();
        if (!this.state.token) {
            this.setState({
                error: {
                    id: 'login_mfa.tokenReq',
                    defaultMessage: 'Please enter an MFA token'
                }
            });
            return;
        }

        this.props.actions.login(this.props.loginId, this.props.password, this.state.token);
    };

    render() {
        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={{flex: 1}}
                keyboardVerticalOffset={0}
            >
                <TouchableWithoutFeedback onPress={this.blur}>
                    <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                        <Image
                            source={logo}
                        />
                        <View>
                            <FormattedText
                                style={[GlobalStyles.header, GlobalStyles.label]}
                                id='login_mfa.enterToken'
                                defaultMessage="To complete the sign in process, please enter a token from your smartphone's authenticator"
                            />
                        </View>
                        <ErrorText error={this.state.error}/>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.inputRef}
                            value={this.state.token}
                            onChangeText={this.handleInput}
                            onSubmitEditing={this.submit}
                            style={GlobalStyles.inputBox}
                            autoCapitalize='none'
                            autoCorrect={false}
                            keyboardType='numeric'
                            placeholder={{id: 'login_mfa.token', defaultMessage: 'MFA Token'}}
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
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        );
    }
}
