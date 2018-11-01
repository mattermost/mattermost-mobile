import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { intlShape } from 'react-intl';
import { WebView, Alert } from 'react-native';


export default class CreateAccountWebView extends PureComponent {

    static propTypes = {
        navigator: PropTypes.object,
        theme: PropTypes.object
    }

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    _onMessage = (event) => {
        if (event.nativeEvent.data === "signup.success") {
            const { intl } = this.context;
            const { theme, navigator } = this.props;
            Alert.alert("Account created", "You can now log in", [{ text: "OK", onPress: () => { } }]);
            navigator.push({
                screen: 'Login',
                title: intl.formatMessage({ id: 'mobile.routes.login', defaultMessage: 'Login' }),
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
                style={{ flex: 1 }}
                source={{ uri: `https://wau.chat/signup_email` }}
                scalesPageToFit
                startInLoadingState
                onMessage={this._onMessage.bind(this)}
                onError={this._onMessage.bind(this)}
            />
        );
    }
}