// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import {intlShape} from 'react-intl';
import IonIcon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info/deviceinfo';

import {ViewTypes} from 'app/constants';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    IOSX_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

export default class ErrorBanner extends PureComponent {
    static propTypes = {
        dismissible: PropTypes.bool,
        isLandscape: PropTypes.bool,
        onClose: PropTypes.func,
        text: PropTypes.string,
        theme: PropTypes.object.isRequired,
        visible: PropTypes.bool,
    };

    static contextTypes = {
        intl: intlShape,
    };

    static defaultProps = {
        dismissible: true,
    };

    constructor(props) {
        super(props);
        this.backgroundColor = new Animated.Value(0);
        this.isX = DeviceInfo.getModel().includes('iPhone X');
        const navBar = this.getNavBarHeight(props.isLandscape);
        this.state = {
            navBar,
            height: new Animated.Value(0),
        };
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps) {
        if (this.props.isLandscape !== prevProps.isLandscape) {
            this.setLocalState({
                navBar: this.getNavBarHeight(this.props.isLandscape),
                height: new Animated.Value(0),
            }, () => {
                this.show();
            });
        }
        if (!prevProps.visible && this.props.visible) {
            this.show();
        }
        if (prevProps.visible && !this.props.visible) {
            this.hide();
        }
    }

    setLocalState = (state, callback) => {
        if (!this.mounted) {
            return;
        }

        this.setState(state, callback);
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

    show = () => {
        Animated.timing(
            this.backgroundColor, {
                toValue: 1,
                duration: 100,
            }
        );
        Animated.timing(
            this.state.height, {
                toValue: this.state.navBar,
                duration: 150,
            }
        ).start();
    };

    hide = () => {
        const {onClose} = this.props;
        if (onClose) {
            onClose();
        }
        Animated.sequence([
            Animated.timing(
                this.state.height, {
                    toValue: 0,
                    duration: 200,
                    delay: 0,
                }
            ),
        ]).start();
    };

    render() {
        const backgroundColor = this.backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['#939393', '#629a41'],
        });
        const {dismissible, text} = this.props;
        const {height} = this.state;

        return (
            <Animated.View style={[styles.container, {backgroundColor, height}]}>
                <Animated.View style={styles.wrapper}>
                    <Text style={styles.message}>{text}</Text>
                    {dismissible && (
                        <TouchableOpacity
                            style={styles.actionContainer}
                            onPress={this.hide}
                        >
                            <IonIcon
                                color='#FFFFFF'
                                name='md-close'
                                size={20}
                            />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        width: '100%',
        zIndex: 9,
        position: 'absolute',
        top: 0,
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
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
