// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, Animated, Text, View} from 'react-native';
import {intlShape} from 'react-intl';
import PropTypes from 'prop-types';

import EventEmitter from '@mm-redux/utils/event_emitter';
import {messageCount} from '@mm-redux/utils/post_list';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import VectorIcon from '@components/vector_icon';
import ViewTypes, {INDICATOR_BAR_HEIGHT} from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {t} from '@utils/i18n';

const HIDDEN_TOP = -100;
const SHOWN_TOP = 0;
export const INDICATOR_BAR_FACTOR = Math.abs(INDICATOR_BAR_HEIGHT / (HIDDEN_TOP - SHOWN_TOP));
export const MIN_INPUT = 0;
export const MAX_INPUT = 1;

const TOP_INTERPOL_CONFIG = {
    inputRange: [
        MIN_INPUT,
        MIN_INPUT + INDICATOR_BAR_FACTOR,
        MAX_INPUT - INDICATOR_BAR_FACTOR,
        MAX_INPUT,
    ],
    outputRange: [
        HIDDEN_TOP - INDICATOR_BAR_HEIGHT,
        HIDDEN_TOP,
        SHOWN_TOP,
        SHOWN_TOP + INDICATOR_BAR_HEIGHT,
    ],
    extrapolate: 'clamp',
};

export const CANCEL_TIMER_DELAY = 400;

export default class MoreMessageButton extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        channelId: PropTypes.string.isRequired,
        loadingPosts: PropTypes.bool.isRequired,
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

    constructor(props) {
        super(props);

        this.state = {moreText: ''};
        this.top = new Animated.Value(0);
        this.disableViewableItemsHandler = false;
        this.viewableItems = [];
    }

    componentDidMount() {
        EventEmitter.on(ViewTypes.INDICATOR_BAR_VISIBLE, this.onIndicatorBarVisible);
        this.removeViewableItemsListener = this.props.registerViewableItemsListener(this.onViewableItemsChanged);
        this.removeScrollEndIndexListener = this.props.registerScrollEndIndexListener(this.onScrollEndIndex);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.INDICATOR_BAR_VISIBLE, this.onIndicatorBarVisible);
        if (this.removeViewableItemsListener) {
            this.removeViewableItemsListener();
        }
        if (this.removeScrollEndIndexListener) {
            this.removeScrollEndIndexListener();
        }
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
            this.viewableItemsChangedTimer = null;
        }
    }

    componentDidUpdate(prevProps) {
        const {channelId, unreadCount, newMessageLineIndex} = this.props;

        if (channelId !== prevProps.channelId) {
            this.reset();
            return;
        }

        if (newMessageLineIndex !== prevProps.newMessageLineIndex && unreadCount === prevProps.unreadCount) {
            if (this.autoCancelTimer) {
                clearTimeout(this.autoCancelTimer);
                this.autoCancelTimer = null;
            }
            this.pressed = false;
            this.uncancel();
        }

        // Cancel the more messages button if the unread changes due to the user marking a
        // post below/above the new message line as unread or if the app returns from the
        // foreground.
        if (unreadCount !== prevProps.unreadCount) {
            this.cancel(true);
        }

        // Cancel the more messages buttonif the new message line index changes due to the
        // channel loading with a new message line that is removed shortly after.
        if (newMessageLineIndex === -1) {
            this.cancel(true);
        }

        // The unreadCount might not be set until after all the viewable items are rendered.
        // In this case we want to manually call onViewableItemsChanged with the stored
        // viewableItems.
        if (unreadCount > prevProps.unreadCount && prevProps.unreadCount === 0) {
            this.onViewableItemsChanged(this.viewableItems);
        }
    }

    onIndicatorBarVisible = (indicatorVisible) => {
        this.indicatorBarVisible = indicatorVisible;
        if (this.buttonVisible) {
            const toValue = this.indicatorBarVisible ? MAX_INPUT : MAX_INPUT - INDICATOR_BAR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    reset = () => {
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
            this.viewableItemsChangedTimer = null;
        }
        if (this.autoCancelTimer) {
            clearTimeout(this.autoCancelTimer);
            this.autoCancelTimer = null;
        }
        this.hide();
        this.setState({moreText: ''});
        this.viewableItems = [];
        this.pressed = false;
        this.canceled = false;
        this.disableViewableItemsHandler = false;
    }

    show = () => {
        if (!this.buttonVisible && this.state.moreText && !this.props.deepLinkURL && !this.canceled) {
            this.buttonVisible = true;
            const toValue = this.indicatorBarVisible ? MAX_INPUT : MAX_INPUT - INDICATOR_BAR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    hide = () => {
        if (this.buttonVisible) {
            this.buttonVisible = false;
            const toValue = this.indicatorBarVisible ? MIN_INPUT : MIN_INPUT + INDICATOR_BAR_FACTOR;
            Animated.spring(this.top, {
                toValue,
                useNativeDriver: true,
            }).start();
        }
    }

    cancel = (force = false) => {
        if (!force && (this.indicatorBarVisible || this.props.loadingPosts)) {
            // If we haven't forced cancel and the indicator bar is visible or
            // we're still loading posts, then to avoid the autoCancelTimer from
            // hiding the button we continue delaying the cancel call.
            clearTimeout(this.autoCancelTimer);
            this.autoCancelTimer = setTimeout(this.cancel, CANCEL_TIMER_DELAY);

            return;
        }

        this.canceled = true;
        this.disableViewableItemsHandler = true;
        this.hide();
    }

    uncancel = () => {
        if (this.autoCancelTimer) {
            clearTimeout(this.autoCancelTimer);
            this.autoCancelTimer = null;
        }
        this.canceled = false;
        this.disableViewableItemsHandler = false;
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

        const {newMessageLineIndex, scrollToIndex} = this.props;
        if (newMessageLineIndex <= 0 || viewableItems.length === 0) {
            return;
        }

        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
            this.viewableItemsChangedTimer = null;
        }

        if (!this.disableViewableItemsHandler) {
            const lastViewableIndex = viewableItems[viewableItems.length - 1].index;
            const nextViewableIndex = lastViewableIndex + 1;
            if (viewableItems[0].index === 0 && nextViewableIndex >= newMessageLineIndex) {
                // Auto scroll if the first post is viewable and
                // * the new message line is viewable OR
                // * the new message line will be the first next viewable item
                scrollToIndex(newMessageLineIndex);
                this.cancel(true);

                return;
            }

            if (lastViewableIndex >= newMessageLineIndex) {
                // In some cases the last New Message line is reached but, since the
                // unreadCount is off, the button will never hide. We call cancel with
                // a delay for this case and cancel the timer in componentDidUpdate if
                // and when the newMessageLineIndex changes.
                this.autoCancelTimer = setTimeout(this.cancel, CANCEL_TIMER_DELAY);
            }

            // The delay here serves to both
            // 1. give enough time for the initial viewable posts to fill up the screen
            // 2. throttle handling by allowing cancellation of the timer when the viewable
            //    items are changing quickly, ie rapid scrolling
            this.viewableItemsChangedTimer = setTimeout(() => {
                this.viewableItemsChangedHandler(lastViewableIndex);
            }, 100);
        }
    }

    viewableItemsChangedHandler = (lastViewableIndex) => {
        const {unreadCount} = this.props;
        const readCount = this.getReadCount(lastViewableIndex);
        const moreCount = unreadCount - readCount;

        if (moreCount <= 0) {
            this.cancel(true);
            return;
        }

        const moreText = this.moreText(moreCount);
        this.setState({moreText}, this.show);
    }

    getReadCount = (lastViewableIndex) => {
        const {postIds} = this.props;

        const viewedPostIds = postIds.slice(0, lastViewableIndex + 1);
        const readCount = messageCount(viewedPostIds);

        return readCount;
    }

    onScrollEndIndex = () => {
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
        const {theme, loadingPosts} = this.props;

        const styles = getStyleSheet(theme);
        const {moreText} = this.state;
        const translateY = this.top.interpolate(TOP_INTERPOL_CONFIG);

        return (
            <Animated.View style={[styles.animatedContainer, {transform: [{translateY}]}]}>
                <View style={styles.container}>
                    <TouchableWithFeedback
                        type={'none'}
                        onPress={this.onMoreMessagesPress}
                    >
                        <View style={styles.iconContainer}>
                            {loadingPosts &&
                                <ActivityIndicator
                                    animating={true}
                                    size='small'
                                    color={theme.buttonColor}
                                />
                            }
                            {!loadingPosts &&
                                <VectorIcon
                                    name='md-arrow-up'
                                    type='ion'
                                    style={styles.icon}
                                />
                            }
                        </View>
                    </TouchableWithFeedback>
                    <TouchableWithFeedback
                        type={'none'}
                        onPress={this.onMoreMessagesPress}
                    >
                        <View style={styles.textContainer}>
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
            paddingLeft: 11,
            paddingRight: 5,
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
        iconContainer: {
            width: 22,
        },
        textContainer: {
            flex: 10,
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingLeft: 4,
        },
        cancelContainer: {
            flex: 1,
            alignItems: 'flex-end',
        },
        text: {
            fontWeight: 'bold',
            color: theme.buttonColor,
            paddingLeft: 0,
            alignSelf: 'center',
        },
        icon: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.buttonColor,
            alignSelf: 'center',
        },
    };
});
