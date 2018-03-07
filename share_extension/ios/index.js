// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {IntlProvider} from 'react-intl';
import DeviceInfo from 'react-native-device-info';
import {
    Animated,
    Dimensions,
    NativeModules,
    NavigatorIOS,
    StyleSheet,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';

import {getTranslations} from 'app/i18n';
import mattermostBucket from 'app/mattermost_bucket';
import Config from 'assets/config';

import ExtensionPost from './extension_post';

const {View: AnimatedView} = Animated;
const ShareExtension = NativeModules.MattermostShare;

export default class SharedApp extends PureComponent {
    constructor(props) {
        super(props);

        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;

        this.state = {
            backdropOpacity: new Animated.Value(0),
            containerOpacity: new Animated.Value(0),
            isLandscape,
        };

        mattermostBucket.readFromFile('entities', Config.AppGroupId).then((value) => {
            this.entities = value;
            this.setState({init: true});
        });
    }

    componentDidMount() {
        Animated.parallel([
            Animated.timing(
                this.state.backdropOpacity,
                {
                    toValue: 0.5,
                    duration: 100,
                }),
            Animated.timing(
                this.state.containerOpacity,
                {
                    toValue: 1,
                    duration: 250,
                }),
        ]).start();
    }

    onClose = (data) => {
        ShareExtension.close(data, Config.AppGroupId);
    };

    onLayout = (e) => {
        const {height, width} = e.nativeEvent.layout;
        const isLandscape = width > height;
        if (this.state.isLandscape !== isLandscape) {
            this.setState({isLandscape});
        }
    };

    userIsLoggedIn = () => {
        return Boolean(this.entities && this.entities.general && this.entities.general.credentials &&
            this.entities.general.credentials.token && this.entities.general.credentials.url);
    };

    render() {
        const {init, isLandscape} = this.state;

        if (!init) {
            return null;
        }

        const theme = Preferences.THEMES.default;
        const locale = DeviceInfo.getDeviceLocale().split('-')[0];

        const initialRoute = {
            component: ExtensionPost,
            title: 'Mattermost',
            passProps: {
                authenticated: this.userIsLoggedIn(),
                entities: this.entities,
                onClose: this.onClose,
                isLandscape,
                theme,
            },
            wrapperStyle: {
                borderRadius: 10,
                backgroundColor: theme.centerChannelBg,
            },
        };

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                <View
                    style={styles.flex}
                    onLayout={this.onLayout}
                >
                    <AnimatedView style={[styles.backdrop, {opacity: this.state.backdropOpacity}]}/>
                    <View style={styles.wrapper}>
                        <AnimatedView
                            style={[
                                styles.container,
                                {
                                    opacity: this.state.containerOpacity,
                                    height: this.userIsLoggedIn() ? 250 : 130,
                                    top: isLandscape ? 20 : 65,
                                },
                            ]}
                        >
                            <NavigatorIOS
                                initialRoute={initialRoute}
                                style={styles.flex}
                                navigationBarHidden={true}
                            />
                        </AnimatedView>
                    </View>
                </View>
            </IntlProvider>
        );
    }
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    backdrop: {
        position: 'absolute',
        flex: 1,
        backgroundColor: '#000',
        height: '100%',
        width: '100%',
    },
    wrapper: {
        flex: 1,
        marginHorizontal: 20,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 10,
        position: 'relative',
        width: '100%',
    },
});
