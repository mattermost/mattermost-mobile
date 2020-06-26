// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, Text, View} from 'react-native';
import {intlShape} from 'react-intl';
import PropTypes from 'prop-types';

import EventEmitter from '@mm-redux/utils/event_emitter';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import VectorIcon from '@components/vector_icon';
import ViewTypes, {NETWORK_INDICATOR_HEIGHT} from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {t} from '@utils/i18n';

const HIDDEN_TOP = -100;
const SHOWN_TOP = 0;
export const INDICATOR_FACTOR = Math.abs(NETWORK_INDICATOR_HEIGHT / (HIDDEN_TOP - SHOWN_TOP));
export const MIN_INPUT = 0;
export const MAX_INPUT = 1;

const TOP_INTERPOL_CONFIG = {
    inputRange: [
        MIN_INPUT,
        MIN_INPUT + INDICATOR_FACTOR,
        MAX_INPUT - INDICATOR_FACTOR,
        MAX_INPUT,
    ],
    outputRange: [
        HIDDEN_TOP - NETWORK_INDICATOR_HEIGHT,
        HIDDEN_TOP,
        SHOWN_TOP,
        SHOWN_TOP + NETWORK_INDICATOR_HEIGHT,
    ],
    extrapolate: 'clamp',
};

export default class MoreMessageButton extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        channelId: PropTypes.string.isRequired,
        unreadCount: PropTypes.number.isRequired,
        newMessageLineIndex: PropTypes.number.isRequired,
        scrollToIndex: PropTypes.func.isRequired,
        registerViewableItemsListener: PropTypes.func.isRequired,
        registerScrollEndIndexListener: PropTypes.func.isRequired,
        deepLinkURL: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {moreText: ''};
    top = new Animated.Value(0);
    disableViewableItemsHandler = false;
    viewableItems = [];

    componentDidMount() {
        EventEmitter.on(ViewTypes.NETWORK_INDICATOR_VISIBLE, this.onNetworkIndicatorVisible);
        this.removeViewableItemsListener = this.props.registerViewableItemsListener(this.onViewableItemsChanged);
        this.removeScrollEndIndexListener = this.props.registerScrollEndIndexListener(this.onScrollEndIndex);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.NETWORK_INDICATOR_VISIBLE, this.onNetworkIndicatorVisible);
        if (this.removeViewableItemsListener) {
            this.removeViewableItemsListener();
        }
        if (this.removeScrollEndIndexListener) {
            this.removeScrollEndIndexListener();
        }
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }
        if (this.moreTextTimer) {
            clearTimeout(this.moreTextTimer);
        }
    }

    componentDidUpdate(prevProps) {
        const {channelId, unreadCount, newMessageLineIndex} = this.props;

        if (channelId !== prevProps.channelId) {
            this.reset();
            return;
        }

        // Cancel the more messages button if the unread count decreases due to the user
        // marking a post below the new message line as unread or if the new message line
        // index changes due to the channel loading with a new message line that is removed
        // shortly after.
        if ((unreadCount !== 0 && unreadCount < prevProps.unreadCount) || newMessageLineIndex === -1) {
            this.cancel();
        }

        // The unreadCount might not be set until after all the viewable items are rendered.
        // In this case we want to manually call onViewableItemsChanged with the stored
        // viewableItems.
        if (unreadCount > prevProps.unreadCount && prevProps.unreadCount === 0) {
            this.onViewableItemsChanged(this.viewableItems);
        }
    }

    onNetworkIndicatorVisible = (indicatorVisible) => {
        this.networkIndicatorVisible = indicatorVisible;
        if (this.visible) {
            const toValue = indicatorVisible ? MAX_INPUT : MAX_INPUT - INDICATOR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    reset = () => {
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }
        this.hide();
        this.disableViewableItemsHandler = false;
        this.viewableItems = [];
        this.pressed = false;
        this.scrolledToLastIndex = false;
        this.canceled = false;
        this.setState({moreText: ''});
    }

    show = () => {
        if (!this.visible && this.state.moreText && !this.props.deepLinkURL && !this.canceled) {
            this.visible = true;
            const toValue = this.networkIndicatorVisible ? MAX_INPUT : MAX_INPUT - INDICATOR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    hide = () => {
        if (this.visible) {
            this.visible = false;
            const toValue = this.networkIndicatorVisible ? MIN_INPUT : MIN_INPUT + INDICATOR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    cancel = () => {
        this.canceled = true;
        this.hide();
        this.disableViewableItemsHandler = true;
    }

    onMoreMessagesPress = () => {
        if (this.pressed) {
            // Prevent multiple taps on the more messages button
            // from calling scrollToIndex.
            return;
        }

        const {newMessageLineIndex, scrollToIndex} = this.props;
        this.pressed = true;
        scrollToIndex(newMessageLineIndex);
    }

    onViewableItemsChanged = (viewableItems) => {
        this.viewableItems = viewableItems;
        this.scrolledToLastIndex = false;

        const {newMessageLineIndex, unreadCount, scrollToIndex} = this.props;
        if (newMessageLineIndex <= 0 || viewableItems.length === 0) {
            return;
        }

        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }

        if (!this.disableViewableItemsHandler) {
            const viewableIndeces = viewableItems.map((item) => item.index);

            // Cancel More Messages button when New Messages line is viewable
            if (newMessageLineIndex >= unreadCount && viewableIndeces[viewableIndeces.length - 1] >= newMessageLineIndex) {
                this.cancel();

                // If the first post is viewable as well, this means that the channel
                // was just loaded. In this case let's auto scroll to the New Messages line
                // in case it's partially hidden behind the top bar.
                if (viewableIndeces[0] === 0) {
                    scrollToIndex(newMessageLineIndex);
                }

                return;
            }

            const delay = this.viewableItemsChangedTimer ? 100 : 0;
            this.viewableItemsChangedTimer = setTimeout(() => {
                this.viewableItemsChangedHandler(viewableIndeces);
            }, delay);
        }
    }

    viewableItemsChangedHandler = (viewableIndeces) => {
        const {newMessageLineIndex, unreadCount} = this.props;
        if (viewableIndeces.includes(newMessageLineIndex)) {
            // We've reached the current new message line index so let's
            // re-enable the button
            this.pressed = false;
            return;
        }

        const readCount = viewableIndeces.pop() || 0;
        const moreCount = unreadCount - readCount;

        if (this.moreTextTimer) {
            clearTimeout(this.moreTextTimer);
        }

        if (moreCount > 0) {
            const moreText = this.moreText(moreCount);
            this.moreTextTimer = setTimeout(() => {
                this.setState({moreText}, this.show);
            }, 200);
        }
    }

    onScrollEndIndex = (endIndex) => {
        this.endIndex = endIndex;
        this.pressed = false;
    }

    moreText = (count) => {
        const {formatMessage} = this.context.intl;
        const isInitialMessage = this.state.moreText === '';

        return formatMessage({
            id: t('mobile.more_messages_button.text'),
            defaultMessage: '{count} {isInitialMessage, select, true {new} other {more new}} {count, plural, one {message} other {messages}}',
        }, {isInitialMessage, count});
    }

    render() {
        const styles = getStyleSheet(this.props.theme);
        const {moreText} = this.state;
        const translateY = this.top.interpolate(TOP_INTERPOL_CONFIG);

        return (
            <Animated.View style={[styles.animatedContainer, {transform: [{translateY}]}]}>
                <View style={styles.container}>
                    <TouchableWithFeedback
                        type={'none'}
                        onPress={this.onMoreMessagesPress}
                    >
                        <View style={styles.moreContainer}>
                            <VectorIcon
                                name='md-arrow-up'
                                type='ion'
                                style={styles.icon}
                            />
                            <Text style={styles.text}>{moreText}</Text>
                        </View>
                    </TouchableWithFeedback>
                    <TouchableWithFeedback
                        type={'none'}
                        onPress={this.cancel}
                    >
                        <View style={styles.cancelContainer}>
                            <VectorIcon
                                name='md-close'
                                type='ion'
                                style={styles.icon}
                            />
                        </View>
                    </TouchableWithFeedback>
                </View>
            </Animated.View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        animatedContainer: {
            flex: 1,
            position: 'absolute',
            zIndex: 1,
            elevation: 1,
            margin: 8,
        },
        container: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            backgroundColor: theme.buttonBg,
            paddingLeft: 18,
            paddingRight: 14,
            paddingVertical: 1,
            borderRadius: 4,
            width: '100%',
            height: 40,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.12,
            shadowRadius: 4,
        },
        moreContainer: {
            flex: 11,
            flexDirection: 'row',
        },
        cancelContainer: {
            flex: 1,
            alignItems: 'flex-end',
        },
        text: {
            fontWeight: 'bold',
            color: theme.buttonColor,
            paddingLeft: 9,
            alignSelf: 'center',
        },
        icon: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.buttonColor,
        },
    };
});
