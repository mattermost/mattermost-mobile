// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {WebView, Alert} from 'react-native';

export default class CreateAccountWebView extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object,
        theme: PropTypes.object,
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    onMessage = (event) => {
        if (event.nativeEvent.data === 'signup.success') {
            const {intl} = this.context;
            const {theme, navigator} = this.props;
            Alert.alert('Account created', 'You can now log in', [{text: 'OK'}]);
            navigator.push({
                screen: 'Login',
                title: intl.formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'}),
                animated: true,
                backButtonTitle: '',
                navigatorStyle: {
                    navBarTextColor: theme.sidebarHeaderTextColor,
                    navBarBackgroundColor: theme.sidebarHeaderBg,
                    navBarButtonColor: theme.sidebarHeaderTextColor,
                    screenBackgroundColor: theme.centerChannelBg,
                },
            });
        }
    }

    render() {
        return (
            <WebView
                style={{flex: 1}}
                source={{uri: 'https://3fd2600c.ngrok.io/signup_email'}}
                scalesPageToFit={true}
                startInLoadingState={true}
                onMessage={this.onMessage.bind(this)}
                onError={this.onMessage.bind(this)}
            />
        );
    }
}