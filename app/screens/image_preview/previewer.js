// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Animated,
    PanResponder,
    Platform,
    View,
    StyleSheet,
} from 'react-native';
import {Client4} from 'mattermost-redux/client';

import imageIcon from 'assets/images/icons/image.png';

import ImageView from './image_view';

const {View: AnimatedView} = Animated;

const DOUBLE_CLICK_THRESHOLD = 250;

export default class Previewer extends Component {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object,
        gutter: PropTypes.number,
        imageHeight: PropTypes.number,
        imageWidth: PropTypes.number,
        onImageTap: PropTypes.func,
        onImageDoubleTap: PropTypes.func,
        onZoom: PropTypes.func,
        shrink: PropTypes.bool,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
    };

    static defaultProps = {
        fadeInOnLoad: false,
        gutter: 20,
        loading: false,
        onImageTap: () => true,
        onImageDoubleTap: () => true,
        onZoom: () => true,
    };

    constructor(props) {
        super(props);

        this.state = {
            imageHeight: new Animated.Value(props.imageHeight),
            imageWidth: new Animated.Value(props.imageWidth),
            opacity: new Animated.Value(0),
            requesting: true,
            retry: 0,
            zooming: false,
        };
    }

    componentWillMount() {
        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponderCapture: (evt, gestureState) => {
                const {numberActiveTouches} = gestureState;
                if (numberActiveTouches === 1 && !this.state.isZooming) {
                    return true;
                } else if (numberActiveTouches === 1) {
                    this.handleResponderRelease(evt);
                }

                return false;
            },
            onPanResponderGrant: () => {
                return;
            },
            onPanResponderTerminate: () => {
                return;
            },
            onShouldBlockNativeResponder: () => false,
        });
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.shrink && !nextProps.shrink) {
            this.setShrink();
        } else if (!this.props.shrink && nextProps.shrink) {
            this.setShrink(true);
        } else if (
            nextProps.imageHeight !== this.props.imageHeight ||
            nextProps.imageWidth !== this.props.imageWidth
        ) {
            this.setState({
                imageHeight: new Animated.Value(nextProps.imageHeight),
                imageWidth: new Animated.Value(nextProps.imageWidth),
            });
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    setShrink = (shrink = false) => {
        const {gutter, imageHeight, imageWidth} = this.props;

        let height = imageHeight;
        let width = imageWidth;
        const duration = 150;
        if (shrink) {
            height = height - gutter;
            width = width - gutter;
        }

        const animations = [
            Animated.timing(this.state.imageWidth, {
                toValue: width,
                duration,
            }),
        ];

        if (Platform.OS === 'android') {
            animations.push(
                Animated.timing(this.state.imageHeight, {
                    toValue: height,
                    duration,
                })
            );
        }

        Animated.parallel(animations).start();
    }

    handleResponderRelease = (evt) => {
        clearTimeout(this.singleTap);
        let cancelSingleTap = false;
        if (this.lastTap && Date.now() - this.lastTap < DOUBLE_CLICK_THRESHOLD) {
            cancelSingleTap = true;
        } else {
            this.lastTap = Date.now();
        }

        if (cancelSingleTap) {
            const {nativeEvent} = evt;
            const x = nativeEvent.locationX;
            const y = nativeEvent.locationY;

            cancelSingleTap = false;
            this.lastTap = null;

            this.props.onImageDoubleTap(x, y);
        } else if (!this.state.isZooming) {
            this.singleTap = setTimeout(() => {
                this.props.onImageTap();
            }, DOUBLE_CLICK_THRESHOLD);
        }
    }

    handleLoadError = () => {
        if (this.state.retry < 4) {
            setTimeout(() => {
                this.setState((prevState) => {
                    return {
                        retry: (prevState.retry + 1),
                        timestamp: Date.now(),
                    };
                });
            }, 300);
        }
    };

    handleLoad = () => {
        this.setState({
            requesting: false,
        });

        Animated.timing(this.state.opacity, {
            toValue: 1,
            duration: 300,
        }).start(() => {
            this.props.addFileToFetchCache(this.handleGetImageURL());
        });
    };

    handleLoadStart = () => {
        this.setState({
            requesting: true,
        });
    };

    handleGetImageURL = () => {
        const {file} = this.props;

        if (file.mime_type === 'image/gif') {
            return Client4.getFileUrl(file.id, this.state.timestamp);
        }

        return Client4.getFilePreviewUrl(file.id, this.state.timestamp);
    };

    attachImageView = (c) => {
        this.imageView = c;
    };

    handleZoom = (zoom) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            isZooming: zoom,
        });

        this.props.onZoom(zoom);
    };

    toggleZoom = (x, y) => {
        const zoom = !this.state.isZooming;

        this.imageView.setZoom(zoom, x, y);
        this.handleZoom(zoom);
    };

    render() {
        const {
            fetchCache,
            imageHeight,
            imageWidth,
            wrapperHeight,
            wrapperWidth,
        } = this.props;

        let source = {};
        let usingIcon = false;
        if (this.state.retry === 4) {
            source = imageIcon;
            usingIcon = true;
        } else {
            source = {uri: this.handleGetImageURL()};
        }

        let isInFetchCache = fetchCache[source.uri];
        if (usingIcon) {
            isInFetchCache = true;
        }

        const imageComponentLoaders = {
            onError: (isInFetchCache) ? null : this.handleLoadError,
            onLoadStart: isInFetchCache ? null : this.handleLoadStart,
            onLoad: isInFetchCache ? null : this.handleLoad,
        };

        const opacity = isInFetchCache ? 1 : this.state.opacity;
        const containerStyle = Platform.select({
            android: {height: imageHeight, width: this.state.imageWidth, backgroundColor: '#000'},
            ios: {flex: 1, backgroundColor: '#000'},
        });

        return (
            <View
                {...this.panResponder.panHandlers}
                onResponderRelease={this.handleResponderRelease}
                style={[style.fileImageWrapper, {height: '100%', width: '100%'}]}
            >
                <AnimatedView style={[containerStyle, {opacity}]}>
                    <ImageView
                        ref={this.attachImageView}
                        source={source}
                        minimumZoomScale={1}
                        maximumZoomScale={3}
                        onZoom={this.handleZoom}
                        resizeMode='contain'
                        imageHeight={imageHeight}
                        imageWidth={imageWidth}
                        style={{height: this.state.imageHeight, width: this.state.imageWidth}}
                        wrapperHeight={wrapperHeight}
                        wrapperWidth={wrapperWidth}
                        {...imageComponentLoaders}
                    />
                </AnimatedView>
                {(!isInFetchCache && this.state.requesting) &&
                <View style={[style.loaderContainer, {backgroundColor: 'white'}]}>
                    <ActivityIndicator size='small'/>
                </View>
                }
            </View>
        );
    }
}

const style = StyleSheet.create({
    fileImageWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
