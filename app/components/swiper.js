// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ScrollView,
    ViewPagerAndroid,
    Platform,
    StyleSheet, InteractionManager,
} from 'react-native';

export default class Swiper extends PureComponent {
    static propTypes = {
        activeDotColor: PropTypes.string,
        children: PropTypes.node.isRequired,
        dotColor: PropTypes.string,
        initialPage: PropTypes.number,
        keyboardShouldPersistTaps: PropTypes.string,
        onIndexChanged: PropTypes.func,
        paginationStyle: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.number,
        ]),
        scrollEnabled: PropTypes.bool,
        showsPagination: PropTypes.bool,
        style: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.number,
        ]),
        width: PropTypes.number,
        onScrollBegin: PropTypes.func,
    };

    static defaultProps = {
        initialPage: 0,
        keyboardShouldPersistTaps: 'handled',
        onIndexChanged: () => null,
        scrollEnabled: true,
        showsPagination: true,
        onScrollBegin: () => true,
    };

    constructor(props) {
        super(props);

        this.runOnLayout = true;
        this.offset = props.width * props.initialPage;
        this.isScrolling = false;

        this.state = this.initialState(props);
    }

    componentDidUpdate(prevProps, prevState) {
        // If the index has changed, we notify the parent via the onIndexChanged callback
        if (this.state.index !== prevState.index) {
            this.props.onIndexChanged(this.state.index);
        }
    }

    initialState = (props) => {
        const index = props.initialPage;

        return {
            index,
            total: React.Children.count(props.children),
        };
    };

    onLayout = (e) => {
        this.offset = e.nativeEvent.layout.width * this.state.index;

        if (this.runOnLayout) {
            if (Platform.OS === 'ios') {
                setTimeout(() => {
                    if (this.scrollView) {
                        this.scrollView.scrollTo({x: this.props.width * this.state.index, animated: false});
                    }
                }, 100);
            } else if (this.scrollView) {
                this.scrollView.setPageWithoutAnimation(this.state.index);
            }
            this.runOnLayout = false;
        }
    };

    onScrollBegin = () => {
        this.isScrolling = true;
        this.props.onScrollBegin();
    };

    onScrollEnd = (e) => {
        // making our events coming from android compatible to updateIndex logic
        if (!e.nativeEvent.contentOffset) {
            e.nativeEvent.contentOffset = {x: e.nativeEvent.position * this.props.width};
        }

        this.isScrolling = false;

        // get the index
        this.updateIndex(e.nativeEvent.contentOffset.x);
    };

    onPageScrollStateChanged = (e) => {
        switch (e) {
        case 'idle':
            this.isScrolling = false;
            break;
        case 'dragging':
            this.isScrolling = true;
            this.props.onScrollBegin();
            break;
        }
    };

    scrollToStart = () => {
        if (Platform.OS === 'ios') {
            InteractionManager.runAfterInteractions(() => {
                this.scrollView.scrollTo({x: 0, animated: false});
            });
        }
    };

    refScrollView = (view) => {
        this.scrollView = view;
    };

    renderScrollView = (pages) => {
        const {
            keyboardShouldPersistTaps,
            scrollEnabled,
        } = this.props;

        if (Platform.OS === 'ios') {
            return (
                <ScrollView
                    ref={this.refScrollView}
                    bounces={false}
                    horizontal={true}
                    removeClippedSubviews={true}
                    automaticallyAdjustContentInsets={true}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.wrapperIOS, this.props.style]}
                    onScrollBeginDrag={this.onScrollBegin}
                    onMomentumScrollEnd={this.onScrollEnd}
                    pagingEnabled={true}
                    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                    scrollEnabled={scrollEnabled}
                >
                    {pages}
                </ScrollView>
            );
        }
        return (
            <ViewPagerAndroid
                ref={this.refScrollView}
                initialPage={this.props.initialPage}
                onPageSelected={this.onScrollEnd}
                onPageScrollStateChanged={this.onPageScrollStateChanged}
                scrollEnabled={scrollEnabled}
                key={pages.length}
                style={[styles.wrapperAndroid, this.props.style]}
            >
                {pages}
            </ViewPagerAndroid>
        );
    };

    renderPagination = () => {
        if (this.state.total <= 1 || !this.props.showsPagination) {
            return null;
        }

        const dots = [];
        const activeDot = (
            <View
                style={[
                    styles.dotStyle,
                    {backgroundColor: this.props.activeDotColor || '#007aff'},
                ]}
            />
        );
        const dot = (
            <View
                style={[
                    styles.dotStyle,
                    {backgroundColor: this.props.dotColor || 'rgba(0,0,0,.2)'},
                ]}
            />
        );
        for (let i = 0; i < this.state.total; i++) {
            if (i === this.state.index) {
                dots.push(React.cloneElement(activeDot, {key: i}));
            } else {
                dots.push(React.cloneElement(dot, {key: i}));
            }
        }

        return (
            <View
                pointerEvents='none'
                style={[styles.pagination, this.props.paginationStyle]}
            >
                {dots}
            </View>
        );
    };

    scrollToIndex = (index, animated) => {
        if (this.isScrolling || this.state.total < 2) {
            return;
        }

        if (Platform.OS === 'ios') {
            this.scrollView.scrollTo({x: (index * this.props.width), animated});
        } else {
            this.scrollView[animated ? 'setPage' : 'setPageWithoutAnimation'](index);
        }

        // trigger onScrollEnd manually in android or if not animated
        if (!animated || Platform.OS === 'android') {
            setImmediate(() => {
                this.onScrollEnd({
                    nativeEvent: {
                        position: index,
                    },
                });
            });
        }
    };

    updateIndex = (offset) => {
        let index = this.state.index;
        const diff = offset - this.offset;
        if (!diff) {
            return;
        }

        index = parseInt(index + Math.round(diff / this.props.width), 10);
        this.offset = offset;
        this.setState({index});
    };

    render() {
        const {
            children,
            width,
        } = this.props;

        const pages = React.Children.map(children, (page, i) => {
            const pageStyle = page ? {width} : {width: 0};
            return (
                <View
                    style={[styles.slide, pageStyle]}
                    key={i}
                >
                    {page}
                </View>
            );
        });

        return (
            <View
                style={[styles.container]}
                onLayout={this.onLayout}
            >
                {this.renderScrollView(pages)}
                {this.renderPagination()}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        position: 'relative',
        flex: 1,
    },
    wrapperIOS: {
        backgroundColor: 'transparent',
    },
    wrapperAndroid: {
        backgroundColor: 'transparent',
        flex: 1,
    },
    slide: {
        backgroundColor: 'transparent',
    },
    pagination: {
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        marginBottom: 13,
    },
    dotStyle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 4,
        marginRight: 4,
        marginTop: 3,
        marginBottom: 3,
    },
});
