import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    ScrollView,
    StyleSheet,
} from 'react-native';

const {Image: AnimatedImage} = Animated;

export default class ImageView extends PureComponent {
    static propTypes = {
        maximumZoomScale: PropTypes.number,
        minimumZoomScale: PropTypes.number,
        onZoom: PropTypes.func,
        showsHorizontalScrollIndicator: PropTypes.bool,
        showsVerticalScrollIndicator: PropTypes.bool,
        wrapperHeight: PropTypes.number.isRequired,
        wrapperWidth: PropTypes.number.isRequired,
    }

    static defaultProps = {
        maximumZoomScale: 3,
        minimumZoomScale: 1,
        onZoom: () => true,
        showsHorizontalScrollIndicator: false,
        showsVerticalScrollIndicator: false,
    }

    attachScrollView = (c) => {
        if (c) {
            this.scrollView = c;
            this.scrollResponder = c.getScrollResponder();
        }
    }

    setZoom = (zoom, x, y) => {
        const rect = {};
        if (zoom) {
            rect.x = x;
            rect.y = y;
        } else {
            rect.height = this.props.wrapperHeight;
            rect.width = this.props.wrapperWidth;
        }

        this.scrollResponder.scrollResponderZoomTo({
            ...rect,
            animated: true,
        });
    }

    handleScroll = (evt) => {
        const {nativeEvent} = evt;

        clearTimeout(this.scrollEventTimeout);
        this.scrollEventTimeout = setTimeout(() => {
            this.props.onZoom(nativeEvent.zoomScale > 1);
        }, 100);
    }

    render() {
        const {
            maximumZoomScale,
            minimumZoomScale,
            showsHorizontalScrollIndicator,
            showsVerticalScrollIndicator,
            ...otherProps
        } = this.props;

        return (
            <ScrollView
                ref={this.attachScrollView}
                alwaysBounceHorizontal={false}
                alwaysBounceVertical={false}
                bounces={false}
                contentContainerStyle={style.content}
                centerContent={true}
                maximumZoomScale={maximumZoomScale}
                minimumZoomScale={minimumZoomScale}
                onScroll={this.handleScroll}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
                showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            >
                <AnimatedImage {...otherProps}/>
            </ScrollView>
        );
    }
}

const style = StyleSheet.create({
    content: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});
