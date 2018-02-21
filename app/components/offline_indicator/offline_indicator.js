// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Animated,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import IonIcon from 'react-native-vector-icons/Ionicons';

import FormattedText from 'app/components/formatted_text';
import {ViewTypes} from 'app/constants';
import checkNetwork from 'app/utils/network';

import {RequestStatus} from 'mattermost-redux/constants';

const HEIGHT = 38;
const OFFLINE = 'offline';
const CONNECTING = 'connecting';
const CONNECTED = 'connected';
const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    IOSX_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

export default class OfflineIndicator extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
        }).isRequired,
        isConnecting: PropTypes.bool,
        isLandscape: PropTypes.bool,
        isOnline: PropTypes.bool,
        webSocketStatus: PropTypes.string,
    };

    static defaultProps: {
        isOnline: true
    };

    constructor(props) {
        super(props);

        this.isX = DeviceInfo.getModel() === 'iPhone X';
        const navBar = this.getNavBarHeight(props.isLandscape);

        this.state = {
            network: null,
            navBar,
            top: new Animated.Value(navBar - HEIGHT),
        };

        this.backgroundColor = new Animated.Value(0);
    }

    componentWillReceiveProps(nextProps) {
        const {isLandscape, webSocketStatus} = this.props;

        if (nextProps.isLandscape !== isLandscape && this.state.network) {
            const navBar = this.getNavBarHeight(nextProps.isLandscape);
            const top = new Animated.Value(navBar - HEIGHT);
            this.setState({navBar, top});
        }

        if (nextProps.isOnline) {
            if (this.state.network && webSocketStatus === RequestStatus.STARTED && nextProps.webSocketStatus === RequestStatus.SUCCESS) {
                // Show the connected animation only if we had a previous network status
                this.connected();
            } else if (webSocketStatus === RequestStatus.STARTED && nextProps.webSocketStatus === RequestStatus.FAILURE && nextProps.isConnecting) {
                // Show the connecting bar if it failed to connect at least twice
                this.connecting();
            }
        } else {
            this.offline();
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (nextState.network !== this.state.network || nextProps.isLandscape !== this.props.isLandscape);
    }

    connect = () => {
        checkNetwork((result) => {
            this.setState({network: CONNECTING}, () => {
                if (result) {
                    this.props.actions.connection(true);
                    this.props.actions.initWebSocket(Platform.OS);
                } else {
                    this.setState({network: OFFLINE});
                }
            });
        });
    };

    connected = () => {
        this.setState({network: CONNECTED});
        Animated.sequence([
            Animated.timing(
                this.backgroundColor, {
                    toValue: 1,
                    duration: 100,
                }
            ),
            Animated.timing(
                this.state.top, {
                    toValue: (this.state.navBar - HEIGHT),
                    duration: 300,
                    delay: 500,
                }
            ),
        ]).start(() => {
            this.backgroundColor.setValue(0);
            this.setState({network: null});
        });
    };

    connecting = () => {
        const prevState = this.state.network;
        this.setState({network: CONNECTING}, () => {
            if (prevState !== OFFLINE) {
                this.show();
            }
        });
    };

    getNavBarHeight = (isLandscape) => {
        if (Platform.OS === 'android') {
            if (isLandscape) {
                return ANDROID_TOP_LANDSCAPE;
            }

            return ANDROID_TOP_PORTRAIT;
        }

        if (this.isX && isLandscape) {
            return IOS_TOP_LANDSCAPE;
        } else if (this.isX) {
            return IOSX_TOP_PORTRAIT;
        } else if (isLandscape) {
            return IOS_TOP_LANDSCAPE + STATUS_BAR_HEIGHT;
        }

        return IOS_TOP_PORTRAIT;
    };

    offline = () => {
        this.setState({network: OFFLINE}, () => {
            this.show();
        });
    };

    show = () => {
        Animated.timing(
            this.state.top, {
                toValue: this.state.navBar,
                duration: 300,
            }
        ).start();
    };

    render() {
        if (!this.state.network) {
            return null;
        }

        const background = this.backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['#939393', '#629a41'],
        });

        let i18nId;
        let defaultMessage;
        let action;
        switch (this.state.network) {
        case OFFLINE:
            i18nId = 'mobile.offlineIndicator.offline';
            defaultMessage = 'Cannot connect to the server';
            action = (
                <TouchableOpacity
                    onPress={this.connect}
                    style={[styles.actionContainer, styles.actionButton]}
                >
                    <IonIcon
                        color='#FFFFFF'
                        name='ios-refresh'
                        size={20}
                    />
                </TouchableOpacity>
            );
            break;
        case CONNECTING:
            i18nId = 'mobile.offlineIndicator.connecting';
            defaultMessage = 'Connecting...';
            action = (
                <View style={styles.actionContainer}>
                    <ActivityIndicator
                        color='#FFFFFF'
                        size='small'
                    />
                </View>
            );
            break;
        case CONNECTED:
        default:
            i18nId = 'mobile.offlineIndicator.connected';
            defaultMessage = 'Connected';
            action = (
                <View style={styles.actionContainer}>
                    <IonIcon
                        color='#FFFFFF'
                        name='md-checkmark'
                        size={20}
                    />
                </View>
            );
            break;
        }

        return (
            <Animated.View style={[styles.container, {top: this.state.top, backgroundColor: background}]}>
                <Animated.View style={styles.wrapper}>
                    <FormattedText
                        defaultMessage={defaultMessage}
                        id={i18nId}
                        style={styles.message}
                    />
                    {action}
                </Animated.View>
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        height: HEIGHT,
        width: '100%',
        zIndex: 9,
        position: 'absolute',
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        height: HEIGHT,
        flexDirection: 'row',
        paddingLeft: 12,
        paddingRight: 5,
    },
    message: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    actionButton: {
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    actionContainer: {
        alignItems: 'flex-end',
        height: 24,
        justifyContent: 'center',
        paddingRight: 10,
        width: 60,
    },
});
