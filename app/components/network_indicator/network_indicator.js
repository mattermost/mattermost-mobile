// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    NetInfo,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import FormattedText from 'app/components/formatted_text';
import {DeviceTypes, ViewTypes} from 'app/constants';
import mattermostBucket from 'app/mattermost_bucket';
import PushNotifications from 'app/push_notifications';
import networkConnectionListener, {checkConnection} from 'app/utils/network';
import {t} from 'app/utils/i18n';

import {RequestStatus} from 'mattermost-redux/constants';

const HEIGHT = 38;
const MAX_WEBSOCKET_RETRIES = 3;
const CONNECTION_RETRY_SECONDS = 5;
const CONNECTION_RETRY_TIMEOUT = 1000 * CONNECTION_RETRY_SECONDS; // 30 seconds
const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    IOSX_TOP_PORTRAIT,
} = ViewTypes;

export default class NetworkIndicator extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeWebSocket: PropTypes.func.isRequired,
            connection: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            setCurrentUserStatusOffline: PropTypes.func.isRequired,
            startPeriodicStatusUpdates: PropTypes.func.isRequired,
            stopPeriodicStatusUpdates: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string,
        isLandscape: PropTypes.bool,
        isOnline: PropTypes.bool,
        websocketErrorCount: PropTypes.number,
        websocketStatus: PropTypes.string,
    };

    static defaultProps = {
        isOnline: true,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            opacity: 0,
        };

        const navBar = this.getNavBarHeight(props.isLandscape);
        this.top = new Animated.Value(navBar - HEIGHT);
        this.clearNotificationTimeout = null;

        this.backgroundColor = new Animated.Value(0);
        this.firstRun = true;

        this.networkListener = networkConnectionListener(this.handleConnectionChange);
    }

    componentDidMount() {
        this.mounted = true;

        AppState.addEventListener('change', this.handleAppStateChange);

        // Attempt to connect when this component mounts
        // if the websocket is already connected it does not try and connect again
        this.connect();
    }

    componentDidUpdate(prevProps) {
        const {
            currentChannelId: prevChannelId,
            isLandscape: prevIsLandscape,
            websocketStatus: previousWebsocketStatus,
        } = prevProps;
        const {currentChannelId, isLandscape, websocketErrorCount, websocketStatus} = this.props;

        if (currentChannelId !== prevChannelId && this.clearNotificationTimeout) {
            clearTimeout(this.clearNotificationTimeout);
            this.clearNotificationTimeout = null;
        }

        if (isLandscape !== prevIsLandscape) {
            const navBar = this.getNavBarHeight(isLandscape);
            const initialTop = websocketErrorCount || previousWebsocketStatus === RequestStatus.FAILURE || previousWebsocketStatus === RequestStatus.NOT_STARTED ? 0 : HEIGHT;
            this.top.setValue(navBar - initialTop);
        }

        if (this.props.isOnline) {
            if (previousWebsocketStatus === RequestStatus.STARTED && websocketStatus === RequestStatus.SUCCESS) {
                // Show the connected animation only if we had a previous network status
                this.connected();
                clearTimeout(this.connectionRetryTimeout);
            } else if (previousWebsocketStatus === RequestStatus.STARTED && websocketStatus === RequestStatus.FAILURE && websocketErrorCount > MAX_WEBSOCKET_RETRIES) {
                this.handleWebSocket(false);
                this.handleReconnect();
            } else if (websocketStatus === RequestStatus.FAILURE) {
                this.show();
            }
        } else {
            this.offline();
        }
    }

    componentWillUnmount() {
        this.mounted = false;

        this.networkListener.removeEventListener();
        AppState.removeEventListener('change', this.handleAppStateChange);

        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = null;
    }

    connect = (displayBar = false) => {
        const {connection} = this.props.actions;
        clearTimeout(this.connectionRetryTimeout);

        NetInfo.isConnected.fetch().then(async (isConnected) => {
            const {hasInternet, serverReachable} = await checkConnection(isConnected);

            connection(hasInternet);
            this.hasInternet = hasInternet;
            this.serverReachable = serverReachable;

            if (serverReachable) {
                this.initializeWebSocket();
            } else {
                if (displayBar) {
                    this.show();
                }

                this.handleWebSocket(false);

                if (hasInternet) {
                    // try to reconnect cause we have internet
                    this.handleReconnect();
                }
            }
        });
    };

    connected = () => {
        Animated.sequence([
            Animated.timing(
                this.backgroundColor, {
                    toValue: 1,
                    duration: 100,
                }
            ),
            Animated.timing(
                this.top, {
                    toValue: (this.getNavBarHeight() - HEIGHT),
                    duration: 300,
                    delay: 500,
                }
            ),
        ]).start(() => {
            this.backgroundColor.setValue(0);
            this.setState({
                opacity: 0,
            });
        });
    };

    getNavBarHeight = (isLandscape = this.props.isLandscape) => {
        if (Platform.OS === 'android') {
            if (isLandscape) {
                return ANDROID_TOP_LANDSCAPE;
            }

            return ANDROID_TOP_PORTRAIT;
        }

        const isX = DeviceTypes.IS_IPHONE_X;

        if (isX && isLandscape) {
            return IOS_TOP_LANDSCAPE;
        } else if (isX) {
            return IOSX_TOP_PORTRAIT;
        } else if (isLandscape) {
            return IOS_TOP_LANDSCAPE;
        }

        return IOS_TOP_PORTRAIT;
    };

    handleWebSocket = (open) => {
        const {actions} = this.props;
        const {
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;

        if (open) {
            this.initializeWebSocket();
            startPeriodicStatusUpdates();
        } else {
            closeWebSocket(true);
            stopPeriodicStatusUpdates();
        }
    };

    handleAppStateChange = async (appState) => {
        const {currentChannelId} = this.props;
        const active = appState === 'active';

        if (active) {
            this.connect(true);

            if (currentChannelId) {
                // Clear the notifications for the current channel after one second
                // this is done so we can cancel it in case the app is brought to the
                // foreground by tapping a notification from another channel
                this.clearNotificationTimeout = setTimeout(() => {
                    PushNotifications.clearChannelNotifications(currentChannelId);
                }, 1000);
            }
        } else {
            this.handleWebSocket(false);
        }
    };

    handleConnectionChange = ({hasInternet, serverReachable}) => {
        const {connection, startPeriodicStatusUpdates} = this.props.actions;

        // On first run always initialize the WebSocket
        // if we have internet connection
        if (hasInternet && this.firstRun) {
            this.initializeWebSocket();
            startPeriodicStatusUpdates();
            this.firstRun = false;

            // if the state of the internet connection was previously known to be false,
            // don't exit connection handler in order for application to register it has
            // reconnected to the internet
            if (this.hasInternet !== false) {
                return;
            }
        }

        // Prevent for being called more than once.
        if (this.hasInternet !== hasInternet) {
            this.hasInternet = hasInternet;
            connection(hasInternet);
        }

        if (this.serverReachable !== serverReachable) {
            this.serverReachable = serverReachable;
            this.handleWebSocket(serverReachable);
        }
    };

    handleReconnect = () => {
        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = setTimeout(() => {
            const {websocketStatus} = this.props;
            if (websocketStatus !== RequestStatus.STARTED || websocketStatus !== RequestStatus.SUCCESS) {
                this.connect();
            }
        }, CONNECTION_RETRY_TIMEOUT);
    };

    initializeWebSocket = async () => {
        const {formatMessage} = this.context.intl;
        const {actions} = this.props;
        const {closeWebSocket, initWebSocket} = actions;
        const platform = Platform.OS;
        let certificate = null;
        if (platform === 'ios') {
            certificate = await mattermostBucket.getPreference('cert');
        }

        initWebSocket(platform, null, null, null, {certificate, forceConnection: true}).catch(() => {
            // we should dispatch a failure and show the app as disconnected
            Alert.alert(
                formatMessage({id: 'mobile.authentication_error.title', defaultMessage: 'Authentication Error'}),
                formatMessage({
                    id: 'mobile.authentication_error.message',
                    defaultMessage: 'Mattermost has encountered an error. Please re-authenticate to start a new session.',
                }),
                [{
                    text: formatMessage({
                        id: 'navbar_dropdown.logout',
                        defaultMessage: 'Logout',
                    }),
                    onPress: actions.logout,
                }],
                {cancelable: false}
            );
            closeWebSocket(true);
        });
    };

    offline = () => {
        if (this.connectionRetryTimeout) {
            clearTimeout(this.connectionRetryTimeout);
        }

        this.show();
    };

    show = () => {
        this.setState({
            opacity: 1,
        });

        Animated.timing(
            this.top, {
                toValue: this.getNavBarHeight(),
                duration: 300,
            }
        ).start(() => {
            this.props.actions.setCurrentUserStatusOffline();
        });
    };

    render() {
        const {isOnline, websocketStatus} = this.props;
        const background = this.backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['#939393', '#629a41'],
        });

        let i18nId;
        let defaultMessage;
        let action;

        if (isOnline) {
            switch (websocketStatus) {
            case RequestStatus.NOT_STARTED:
            case RequestStatus.FAILURE:
            case RequestStatus.STARTED:
                i18nId = t('mobile.offlineIndicator.connecting');
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
            case RequestStatus.SUCCESS:
            default:
                i18nId = t('mobile.offlineIndicator.connected');
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
        } else {
            i18nId = t('mobile.offlineIndicator.offline');
            defaultMessage = 'No internet connection';
        }

        return (
            <Animated.View style={[styles.container, {top: this.top, backgroundColor: background, opacity: this.state.opacity}]}>
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
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    actionContainer: {
        alignItems: 'flex-end',
        height: 24,
        justifyContent: 'center',
        paddingRight: 10,
        width: 60,
    },
});
