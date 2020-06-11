// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, Text, View} from 'react-native';
import PropTypes from 'prop-types';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import VectorIcon from 'app/components/vector_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

export default class MoreMessageButton extends React.PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired,
        channelId: PropTypes.string.isRequired,
        unreadCount: PropTypes.number.isRequired,
        initialIndex: PropTypes.number.isRequired,
        scrollToIndex: PropTypes.number.isRequired,
        registerViewableItemsListener: PropTypes.func.isRequired,
        deepLinkURL: PropTypes.string,
    };

    state = {
        moreCount: 0,
    };
    top = new Animated.Value(-100);
    prevInitialIndex = 0;

    componentDidMount() {
        this.removeListener = this.props.registerViewableItemsListener(this.onViewableItemsChanged);

        this.show();
        setTimeout(this.hide, 1000);
    }

    componentWillUnmount() {
        if (this.removeListener) {
            this.removeListener();
            this.reset();
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.channelId !== prevProps.channelId) {
            this.reset();
        }
    }

    reset = () => {
        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }
        this.hide();
        this.prevInitialIndex = 0;
        this.disableViewableItemsHandler = false;
    }

    show = () => {
        if (!this.visible && this.state.moreCount > 0 && !this.props.deepLinkURL) {
            this.visible = true;
            Animated.spring(this.top, {
                toValue: 10,
                useNativeDriver: false,
            }).start();
        }
    }

    hide = () => {
        if (this.visible) {
            this.visible = false;
            Animated.spring(this.top, {
                toValue: -50,
                useNativeDriver: false,
            }).start();
        }
    }

    cancel = () => {
        this.hide();
        this.disableViewableItemsHandler = true;
    }

    onMoreMessagesPress = () => {
        const {initialIndex, scrollToIndex} = this.props;
        if (initialIndex === this.prevInitialIndex) {
            // Prevent multiple taps on the more messages button from calling
            // scrollToIndex if the initialIndex has not yet changed.
            return;
        }

        this.prevInitialIndex = initialIndex;
        scrollToIndex(initialIndex);
    }

    onViewableItemsChanged = (viewableItems) => {
        const {initialIndex, unreadCount} = this.props;
        if (initialIndex <= 0 || viewableItems.length === 0) {
            return;
        }

        if (this.viewableItemsChangedTimer) {
            clearTimeout(this.viewableItemsChangedTimer);
        }

        const viewableIndexes = viewableItems.map((item) => item.index);

        // Hide More Messages button when New Messages line is in view
        if (initialIndex >= unreadCount && viewableIndexes[viewableIndexes.length - 1] >= initialIndex) {
            this.hide();
            this.disableViewableItemsHandler = true;
            return;
        }

        if (!this.disableViewableItemsHandler) {
            let delay = 0;
            if (this.viewableItemsChangedTimer) {
                clearTimeout(this.viewableItemsChangedTimer);
                delay = 100;
            }
            this.viewableItemsChangedTimer = setTimeout(() => {
                this.viewableItemsChangedHandler(viewableIndexes);
            }, delay);
        }
    }

    viewableItemsChangedHandler = (viewableIndexes) => {
        const {initialIndex, unreadCount, scrollToIndex} = this.props;
        if (!viewableIndexes.includes(initialIndex)) {
            const readCount = viewableIndexes[viewableIndexes.length - 1];
            const moreCount = unreadCount - readCount;

            if (moreCount === 0) {
                scrollToIndex(initialIndex);
            } else if (moreCount > 0) {
                this.setState({moreCount}, this.show);
            }
        }
    }

    moreMessagesText = () => {
        const moreCount = Math.max(this.state.moreCount, 0);

        let moreText = Math.min(60, moreCount);
        if (this.prevInitialIndex === 0) {
            if (moreCount > 60) {
                moreText += '+';
            }
        } else {
            moreText += ' more';
        }

        moreText += moreCount === 1 ? ' new message' : ' new messages';

        return moreText;
    }

    render() {
        const styles = getStyleSheet(this.props.theme);

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
                            <Text style={styles.text}>{this.moreMessagesText()}</Text>
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
            marginRight: 10,
            marginLeft: 10,
        },
        container: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
            padding: 10,
            borderRadius: 5,
            width: '100%',
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
            color: 'white',
            paddingHorizontal: 5,
        },
        icon: {
            color: 'white',
            paddingHorizontal: 5,
        },
    };
});