// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import Button from 'react-native-button';

import {RequestStatus} from 'mattermost-redux/constants';
import {Client, Client4} from 'mattermost-redux/client';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';

import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {GlobalStyles} from 'app/styles';
import {isValidUrl, stripTrailingSlashes} from 'app/utils/url';

import logo from 'assets/images/logo.png';

export default class SelectServer extends PureComponent {
    static propTypes = {
        transition: PropTypes.bool.isRequired,
        serverUrl: PropTypes.string.isRequired,
        pingRequest: PropTypes.object.isRequired,
        configRequest: PropTypes.object.isRequired,
        licenseRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getPing: PropTypes.func.isRequired,
            resetPing: PropTypes.func.isRequired,
            handleLoginOptions: PropTypes.func.isRequired,
            handleServerUrlChanged: PropTypes.func.isRequired,
            unrenderDrawer: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null
        };
    }

    componentDidMount() {
        this.props.actions.unrenderDrawer();
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.transition && nextProps.transition) {
            this.props.actions.resetPing().then(() => {
                this.props.actions.handleLoginOptions();
            });
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

    onClick = async () => {
        const url = this.props.serverUrl;
        let error = null;

        Keyboard.dismiss();

        if (isValidUrl(url)) {
            Client4.setUrl(stripTrailingSlashes(url));
            Client.setUrl(stripTrailingSlashes(url));
            await this.props.actions.getPing();
        } else {
            error = {
                intl: {
                    id: 'mobile.server_url.invalid_format',
                    defaultMessage: 'URL must start with http:// or https://'
                }
            };
        }

        this.setState({error});
    };

    inputRef = (ref) => {
        this.textInput = ref;
    };

    blur = () => {
        if (this.textInput) {
            this.textInput.refs.wrappedInstance.blur();
        }
    };

    render() {
        const {serverUrl, pingRequest, configRequest, licenseRequest} = this.props;
        const isLoading = pingRequest.status === RequestStatus.STARTED ||
            configRequest.status === RequestStatus.STARTED ||
            licenseRequest.status === RequestStatus.STARTED;

        let proceed;
        if (isLoading) {
            proceed = (
                <ActivityIndicator
                    animating={true}
                    size='small'
                />
            );
        } else {
            proceed = (
                <Button
                    onPress={this.onClick}
                    containerStyle={GlobalStyles.signupButton}
                >
                    <FormattedText
                        style={GlobalStyles.signupButtonText}
                        id='mobile.components.select_server_view.proceed'
                        defaultMessage='Proceed'
                    />
                </Button>
            );
        }

        const error = pingRequest.error || configRequest.error || licenseRequest.error;

        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={{flex: 1}}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle='light-content'/>
                <TouchableWithoutFeedback onPress={this.blur}>
                    <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                        <Image
                            source={logo}
                        />
                        <View>
                            <FormattedText
                                style={[GlobalStyles.header, GlobalStyles.label]}
                                id='mobile.components.select_server_view.enterServerUrl'
                                defaultMessage='Enter Server URL'
                            />
                        </View>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.inputRef}
                            value={serverUrl}
                            onChangeText={this.props.actions.handleServerUrlChanged}
                            onSubmitEditing={this.onClick}
                            style={GlobalStyles.inputBox}
                            autoCapitalize='none'
                            autoCorrect={false}
                            keyboardType='url'
                            placeholder={{id: 'mobile.components.select_server_view.siteUrlPlaceholder', defaultMessage: 'https://mattermost.example.com'}}
                            returnKeyType='go'
                            underlineColorAndroid='transparent'
                        />
                        {proceed}
                        <ErrorText error={this.state.error || error}/>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        );
    }
}
