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

export const HIDDEN_TOP = -100;
export const SHOWN_TOP = 0;

export default class MoreMessageButton extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        channelId: PropTypes.string.isRequired,
        unreadCount: PropTypes.number.isRequired,
        newMessageLineIndex: PropTypes.number.isRequired,
        scrollToIndex: PropTypes.func.isRequired,
        registerViewableItemsListener: PropTypes.func.isRequired,
        deepLinkURL: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {moreCount: 0, moreText: ''};
    top = new Animated.Value(HIDDEN_TOP);
    opacity = new Animated.Value(1);
    prevNewMessageLineIndex = 0;
    disableViewableItemsHandler = false;
    viewableItems = [];

    componentDidMount() {
        EventEmitter.on(ViewTypes.NETWORK_INDICATOR_VISIBLE, this.onNetworkIndicatorVisible);
        this.removeViewableItemsListener = this.props.registerViewableItemsListener(this.onViewableItemsChanged);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.NETWORK_INDICATOR_VISIBLE, this.onNetworkIndicatorVisible);
        if (this.removeViewableItemsListener) {
            this.removeViewableItemsListener();
        }
        if (this.removeScrollEndListener) {
            this.removeScrollEndListener();
        }
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }
        if (this.opacityAnimationTimer) {
            clearTimeout(this.opacityAnimationTimer);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const {channelId, unreadCount, newMessageLineIndex} = this.props;
        const {moreText} = this.state;

        if (channelId !== prevProps.channelId) {
            this.reset();
        }

        this.moreTextSame = moreText === prevState.moreText;
        if (this.moreTextSame) {
            this.onScrollEnd();
        }

        // Hide the more messages button if the unread count decreases due to the user
        // marking a post below the new message line as unread or if the new message line
        // index changes due to the channel loading with a new message line that is removed
        // shortly after.
        if ((unreadCount !== 0 && unreadCount < prevProps.unreadCount) || newMessageLineIndex === -1) {
            this.hide();
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
        if (this.visible && indicatorVisible) {
            Animated.spring(this.top, {
                toValue: SHOWN_TOP + NETWORK_INDICATOR_HEIGHT,
                useNativeDriver: false,
            }).start();
        }
    }

    reset = () => {
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }
        if (this.opacityAnimationTimer) {
            clearTimeout(this.opacityAnimationTimer);
        }
        this.hide();
        this.prevNewMessageLineIndex = 0;
        this.disableViewableItemsHandler = false;
        this.viewableItems = [];
    }

    show = () => {
        if (!this.visible && this.state.moreCount > 0 && !this.props.deepLinkURL) {
            this.visible = true;
            const indicatorHeight = this.networkIndicatorVisible ? NETWORK_INDICATOR_HEIGHT : 0;
            Animated.spring(this.top, {
                toValue: SHOWN_TOP + indicatorHeight,
                useNativeDriver: false,
            }).start();
        }
    }

    hide = () => {
        if (this.visible) {
            this.visible = false;
            const indicatorHeight = this.networkIndicatorVisible ? NETWORK_INDICATOR_HEIGHT : 0;
            Animated.spring(this.top, {
                toValue: HIDDEN_TOP - indicatorHeight,
                useNativeDriver: false,
            }).start();
        }
    }

    cancel = () => {
        this.hide();
        this.disableViewableItemsHandler = true;
    }

    onMoreMessagesPress = () => {
        const {newMessageLineIndex, scrollToIndex} = this.props;
        if (newMessageLineIndex === this.prevNewMessageLineIndex) {
            // Prevent multiple taps on the more messages button from calling
            // scrollToIndex if the newMessageLineIndex has not yet changed.
            return;
        }

        this.pressed = true;
        this.prevNewMessageLineIndex = newMessageLineIndex;
        scrollToIndex(newMessageLineIndex);
    }

    onViewableItemsChanged = (viewableItems) => {
        this.viewableItems = viewableItems;
        this.newMessageLineReached = false;

        const {newMessageLineIndex, unreadCount, scrollToIndex} = this.props;
        if (newMessageLineIndex <= 0 || viewableItems.length === 0) {
            return;
        }

        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }

        if (!this.disableViewableItemsHandler) {
            const viewableIndeces = viewableItems.map((item) => item.index);

            // Hide More Messages button when New Messages line is viewable
            if (newMessageLineIndex >= unreadCount && viewableIndeces[viewableIndeces.length - 1] >= newMessageLineIndex) {
                this.hide();
                this.disableViewableItemsHandler = true;

                // If the first post is viewable as well, this means that the channel
                // was just loaded. In this case let's auto scroll to the New Messages line
                // in case it's partially hidden behind the top bar.
                if (viewableIndeces[0] === 0) {
                    scrollToIndex(newMessageLineIndex);
                }

                return;
            }

            if (viewableIndeces[viewableIndeces.length - 1] >= newMessageLineIndex) {
                this.newMessageLineReached = true;
                this.onScrollEnd();
            }

            const delay = this.viewableItemsChangedTimer ? 100 : 0;
            this.viewableItemsChangedTimer = setTimeout(() => {
                this.viewableItemsChangedHandler(viewableIndeces);
            }, delay);
        }
    }

    viewableItemsChangedHandler = (viewableIndeces) => {
        const {newMessageLineIndex, unreadCount} = this.props;
        if (!viewableIndeces.includes(newMessageLineIndex)) {
            const readCount = viewableIndeces.pop() || 0;
            const moreCount = unreadCount - readCount;

            if (moreCount > 0) {
                const moreText = this.moreText(moreCount);
                this.setState({moreCount, moreText}, this.show);
            }
        }
    }

    onScrollEnd = () => {
        if (this.moreTextSame && this.newMessageLineReached && this.pressed) {
            this.pressed = false;
            this.newMessageLineReached = false;
            this.opacityAnimation();
        }
    }

    opacityAnimation = () => {
        Animated.timing(this.opacity, {
            toValue: 0,
            useNativeDriver: false,
            duration: 100,
        }).start(() => {
            Animated.timing(this.opacity, {
                toValue: 1,
                useNativeDriver: false,
                duration: 100,
            }).start();
        });
    }

    intlMoreText = (firstPage, singular, countText) => {
        const {formatMessage} = this.context.intl;
        let id;
        let defaultMessage;

        switch (true) {
        case (firstPage && singular):
            id = t('mobile.more_messages.firstPageSingular');
            defaultMessage = '{countText} new message';
            break;
        case (firstPage && !singular):
            id = t('mobile.more_messages.firstPagePlural');
            defaultMessage = '{countText} new messages';
            break;
        case (!firstPage && singular):
            id = t('mobile.more_messages.nextPageSingular');
            defaultMessage = '{countText} more new message';
            break;
        case (!firstPage && !singular):
            id = t('mobile.more_messages.nextPagePlural');
            defaultMessage = '{countText} more new messages';
            break;
        default:
            break;
        }

        return formatMessage({id, defaultMessage}, {countText});
    };

    moreText = (moreCount) => {
        let countText = Math.min(60, moreCount);
        if (moreCount > 60) {
            countText += '+';
        }

        const firstPage = this.prevNewMessageLineIndex === 0;
        const singular = moreCount === 1;

        return this.intlMoreText(firstPage, singular, countText);
    }

    render() {
        const styles = getStyleSheet(this.props.theme);
        const {moreText} = this.state;

        return (
            <Animated.View style={[styles.animatedContainer, {top: this.top}]}>
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
                            <Animated.View style={{opacity: this.opacity}}>
                                <Text style={styles.text}>{moreText}</Text>
                            </Animated.View>
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
