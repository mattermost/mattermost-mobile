// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Animated,
    AppState,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {SafeAreaView} from 'react-native-safe-area-context';

import {RequestStatus} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {ViewTypes} from '@constants';
import {INDICATOR_BAR_HEIGHT} from '@constants/view';
import networkConnectionListener, {checkConnection} from '@utils/network';
import {t} from '@utils/i18n';

import mattermostBucket from 'app/mattermost_bucket';
import PushNotifications from '@init/push_notifications';

const MAX_WEBSOCKET_RETRIES = 3;
const CONNECTION_RETRY_SECONDS = 5;
const CONNECTION_RETRY_TIMEOUT = 1000 * CONNECTION_RETRY_SECONDS; // 30 seconds
const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_INSETS_TOP_PORTRAIT,
} = ViewTypes;

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export default class NetworkIndicator extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeWebSocket: PropTypes.func.isRequired,
            connection: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
            markChannelViewedAndReadOnReconnect: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            setChannelRetryFailed: PropTypes.func.isRequired,
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

    constructor(props) {
        super(props);

        const navBarHeight = Platform.select({
            android: props.isLandscape ? ANDROID_TOP_LANDSCAPE : ANDROID_TOP_PORTRAIT,
            ios: props.isLandscape ? IOS_TOP_LANDSCAPE : IOS_INSETS_TOP_PORTRAIT,
        });

        this.state = {
            opacity: 0,
            navBarHeight,
        };

        this.top = new Animated.Value(navBarHeight - INDICATOR_BAR_HEIGHT);
        this.clearNotificationTimeout = null;

        this.backgroundColor = new Animated.Value(0);
        this.firstRun = true;
        this.statusUpdates = false;

        this.networkListener = networkConnectionListener(this.handleConnectionChange);
    }

    componentDidMount() {
        this.mounted = true;

        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(ViewTypes.CHANNEL_NAV_BAR_CHANGED, this.getNavBarHeight);

        // Attempt to connect when this component mounts
        // if the websocket is already connected it does not try and connect again
        this.connect(true);
    }

    componentDidUpdate(prevProps, prevState) {
        const {
            currentChannelId: prevChannelId,
            websocketStatus: previousWebsocketStatus,
        } = prevProps;
        const {currentChannelId, websocketErrorCount, websocketStatus} = this.props;

        if (currentChannelId !== prevChannelId && this.clearNotificationTimeout) {
            clearTimeout(this.clearNotificationTimeout);
            this.clearNotificationTimeout = null;
        }

        if (prevState.navBarHeight !== this.state.navBarHeight) {
            const initialTop = websocketErrorCount || previousWebsocketStatus === RequestStatus.FAILURE || previousWebsocketStatus === RequestStatus.NOT_STARTED ? 0 : INDICATOR_BAR_HEIGHT;
            this.top.setValue(this.state.navBarHeight - initialTop);
        }

        if (this.props.isOnline) {
            if (previousWebsocketStatus !== RequestStatus.SUCCESS && websocketStatus === RequestStatus.SUCCESS) {
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
        const {closeWebSocket, stopPeriodicStatusUpdates} = this.props.actions;
        this.mounted = false;

        closeWebSocket(false);
        stopPeriodicStatusUpdates();
        this.networkListener.removeEventListener();
        AppState.removeEventListener('change', this.handleAppStateChange);
        EventEmitter.off(ViewTypes.CHANNEL_NAV_BAR_CHANGED, this.getNavBarHeight);

        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = null;
    }

    connect = (displayBar = false) => {
        const {connection, startPeriodicStatusUpdates} = this.props.actions;
        clearTimeout(this.connectionRetryTimeout);

        NetInfo.fetch().then(async ({isConnected}) => {
            const {hasInternet, serverReachable} = await checkConnection(isConnected);

            connection(hasInternet);
            this.hasInternet = hasInternet;
            this.serverReachable = serverReachable;

            if (serverReachable) {
                this.statusUpdates = true;
                this.initializeWebSocket();
                startPeriodicStatusUpdates();
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
        if (this.visible) {
            this.visible = false;
            Animated.sequence([
                Animated.timing(
                    this.backgroundColor, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: false,
                    },
                ),
                Animated.timing(
                    this.top, {
                        toValue: (this.state.navBarHeight - INDICATOR_BAR_HEIGHT),
                        duration: 300,
                        delay: 500,
                        useNativeDriver: false,
                    },
                ),
            ]).start(() => {
                EventEmitter.emit(ViewTypes.INDICATOR_BAR_VISIBLE, false);
                this.backgroundColor.setValue(0);
                this.setState({
                    opacity: 0,
                });
            });
        }
    };

    getNavBarHeight = (navBarHeight) => {
        this.setState({navBarHeight});
    };

    handleWebSocket = (open) => {
        const {actions} = this.props;
        const {
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;

        if (open) {
            this.statusUpdates = true;
            this.initializeWebSocket();
            startPeriodicStatusUpdates();
        } else if (this.statusUpdates) {
            this.statusUpdates = false;
            closeWebSocket(true);
            stopPeriodicStatusUpdates();
        }
    };

    handleAppStateChange = async (appState) => {
        const {actions, currentChannelId} = this.props;
        const active = appState === 'active';
        if (active) {
            this.connect(true);

            if (currentChannelId) {
                // Clear the notifications for the current channel after one second
                // this is done so we can cancel it in case the app is brought to the
                // foreground by tapping a notification from another channel
                this.clearNotificationTimeout = setTimeout(() => {
                    PushNotifications.clearChannelNotifications(currentChannelId);
                    actions.markChannelViewedAndReadOnReconnect(currentChannelId);
                }, 1000);
            }
        } else {
            this.handleWebSocket(false);
        }
    };

    handleConnectionChange = ({hasInternet, serverReachable}) => {
        const {connection} = this.props.actions;

        // On first run always initialize the WebSocket
        // if we have internet connection
        if (hasInternet && this.firstRun) {
            this.initializeWebSocket();
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
        const {actions} = this.props;
        const {closeWebSocket, initWebSocket} = actions;
        const platform = Platform.OS;
        let certificate = null;
        if (platform === 'ios') {
            certificate = await mattermostBucket.getPreference('cert');
        }

        initWebSocket({certificate, forceConnection: true}).catch(() => {
            // we should dispatch a failure and show the app as disconnected
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
        if (!this.visible) {
            this.visible = true;
            EventEmitter.emit(ViewTypes.INDICATOR_BAR_VISIBLE, true);
            this.setState({
                opacity: 1,
            });

            Animated.timing(
                this.top, {
                    toValue: this.state.navBarHeight,
                    duration: 300,
                    useNativeDriver: false,
                },
            ).start(() => {
                this.props.actions.setCurrentUserStatusOffline();
            });
        }
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
                        <CompassIcon
                            color='#FFFFFF'
                            name='check'
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
            <Animated.View
                pointerEvents='none'
                style={[styles.container, {top: this.top, backgroundColor: background, opacity: this.state.opacity}]}
            >
                <AnimatedSafeAreaView
                    edges={['left', 'right']}
                    style={styles.wrapper}
                >
                    <FormattedText
                        defaultMessage={defaultMessage}
                        id={i18nId}
                        style={styles.message}
                    />
                    {action}
                </AnimatedSafeAreaView>
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        height: INDICATOR_BAR_HEIGHT,
        width: '100%',
        position: 'absolute',
        ...Platform.select({
            android: {
                elevation: 9,
            },
            ios: {
                zIndex: 9,
            },
        }),
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        height: INDICATOR_BAR_HEIGHT,
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
