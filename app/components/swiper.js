// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    View,
    ScrollView,
    ViewPagerAndroid,
    Platform,
    StyleSheet
} from 'react-native';

export default class Swiper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        style: PropTypes.object,
        showsPagination: PropTypes.bool,
        paginationStyle: PropTypes.object,
        initialPage: PropTypes.number,
        width: PropTypes.number,
        dotColor: PropTypes.string,
        activeDotColor: PropTypes.string,
        keyboardShouldPersistTaps: PropTypes.string,
        onIndexChanged: PropTypes.func
    };

    static defaultProps = {
        removeClippedSubviews: true,
        showsPagination: true,
        initialPage: 0,
        keyboardShouldPersistTaps: 'handled',
        onIndexChanged: () => null
    };

    constructor(props) {
        super(props);

        this.runOnLayout = true;
        this.state = this.initialState(props);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.initialState(nextProps));
    }

    componentWillUpdate(nextProps, nextState) {
        // If the index has changed, we notify the parent via the onIndexChanged callback
        if (this.state.index !== nextState.index) {
            this.props.onIndexChanged(nextState.index);
        }
    }

    initialState = (props) => {
        const state = this.state || {index: props.initialPage};
        const index = state.index;
        const offset = props.width * index;

        this.internals = {
            isScrolling: false,
            offset
        };

        return {
            index,
            total: React.Children.count(props.children)
        };
    };

    onLayout = () => {
        if (this.runOnLayout) {
            if (Platform.OS === 'ios') {
                this.scrollView.scrollTo({x: this.internals.offset, animated: false});
            } else {
                this.scrollView.setPageWithoutAnimation(this.state.index);
            }
            this.runOnLayout = false;
        }
    };

    onScrollBegin = () => {
        this.internals.isScrolling = true;
    };

    onScrollEnd = (e) => {
        // making our events coming from android compatible to updateIndex logic
        if (!e.nativeEvent.contentOffset) {
            e.nativeEvent.contentOffset = {x: e.nativeEvent.position * this.props.width};
        }

        this.internals.isScrolling = false;

        // get the index
        this.updateIndex(e.nativeEvent.contentOffset.x);
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
        if (Platform.OS === 'ios') {
            return (
                <ScrollView
                    ref={this.refScrollView}
                    {...this.props}
                    horizontal={true}
                    removeClippedSubviews={true}
                    automaticallyAdjustContentInsets={true}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.wrapperIOS, this.props.style]}
                    onScrollBeginDrag={this.onScrollBegin}
                    onMomentumScrollEnd={this.onScrollEnd}
                    pagingEnabled={true}
                >
                    {pages}
                </ScrollView>
            );
        }
        return (
            <ViewPagerAndroid
                ref={this.refScrollView}
                {...this.props}
                initialPage={this.props.initialPage}
                onScrollBeginDrag={this.onScrollBegin}
                onPageSelected={this.onScrollEnd}
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
                    {backgroundColor: this.props.activeDotColor || '#007aff'}
                ]}
            />
        );
        const dot = (
            <View
                style={[
                    styles.dotStyle,
                    {backgroundColor: this.props.dotColor || 'rgba(0,0,0,.2)'}
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
        if (this.internals.isScrolling || this.state.total < 2) {
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
                        position: index
                    }
                });
            });
        }
    };

    updateIndex = (offset) => {
        let index = this.state.index;
        const diff = offset - this.internals.offset;
        if (!diff) {
            return;
        }

        index = parseInt(index + Math.round(diff / this.props.width), 10);
        this.internals.offset = offset;
        this.setState({index});
    };

    render() {
        const {
            children,
            width
        } = this.props;

        let pages = [];
        if (this.state.total > 1) {
            pages = React.Children.map(children, (page, i) => {
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
        } else {
            pages = (
                <View
                    style={[styles.slide, {width}]}
                    key={0}
                >
                    {children}
                </View>
            );
        }

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
        flex: 1
    },
    wrapperIOS: {
        backgroundColor: 'transparent'
    },
    wrapperAndroid: {
        backgroundColor: 'transparent',
        flex: 1
    },
    slide: {
        backgroundColor: 'transparent'
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
        backgroundColor: 'transparent'
    },
    dotStyle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 3,
        marginRight: 3,
        marginTop: 3,
        marginBottom: 3
    }
});
