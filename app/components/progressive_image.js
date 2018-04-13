// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Image, ImageBackground, Platform, View, StyleSheet} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export default class ProgressiveImage extends PureComponent {
    static propTypes = {
        isBackgroundImage: PropTypes.bool,
        children: CustomPropTypes.Children,
        defaultSource: PropTypes.oneOfType([PropTypes.object, PropTypes.number]), // this should be provided by the component
        filename: PropTypes.string,
        imageUri: PropTypes.string,
        style: CustomPropTypes.Style,
        thumbnailUri: PropTypes.string,
    };

    constructor(props) {
        super(props);

        this.subscribedToCache = true;

        this.state = {
            intensity: null,
            thumb: null,
            uri: null,
        };
    }

    componentWillMount() {
        const intensity = new Animated.Value(100);
        this.setState({intensity});
        this.load(this.props);
    }

    componentWillReceiveProps(props) {
        this.load(props);
    }

    componentDidUpdate(prevProps, prevState) {
        const {intensity, thumb, uri} = this.state;
        if (uri && thumb && uri !== thumb && prevState.uri !== uri) {
            Animated.timing(intensity, {
                duration: 300,
                toValue: 0,
                useNativeDriver: Platform.OS === 'android',
            }).start();
        }
    }

    componentWillUnmount() {
        this.subscribedToCache = false;
    }

    load = (props) => {
        const {filename, imageUri, style, thumbnailUri} = props;
        this.style = [
            StyleSheet.absoluteFill,
            ...style,
        ];

        if (thumbnailUri) {
            ImageCacheManager.cache(filename, thumbnailUri, this.setThumbnail);
        } else if (imageUri) {
            ImageCacheManager.cache(filename, imageUri, this.setImage);
        }
    };

    setImage = (uri) => {
        if (this.subscribedToCache) {
            let path = uri;

            if (Platform.OS === 'android') {
                path = `file://${uri}`;
            }

            this.setState({uri: path});
        }
    };

    setThumbnail = (thumb) => {
        if (this.subscribedToCache) {
            const {filename, imageUri} = this.props;
            let path = thumb;

            if (Platform.OS === 'android') {
                path = `file://${thumb}`;
            }

            this.setState({thumb: path}, () => {
                setTimeout(() => {
                    ImageCacheManager.cache(filename, imageUri, this.setImage);
                }, 300);
            });
        }
    };

    render() {
        const {style, defaultSource, isBackgroundImage, ...otherProps} = this.props;
        const {style: computedStyle} = this;
        const {uri, intensity, thumb} = this.state;
        const hasDefaultSource = Boolean(defaultSource);
        const hasPreview = Boolean(thumb);
        const hasURI = Boolean(uri);
        const isImageReady = uri && uri !== thumb;
        const opacity = intensity.interpolate({
            inputRange: [50, 100],
            outputRange: [0.5, 1],
        });

        let DefaultComponent;
        let ImageComponent;
        if (isBackgroundImage) {
            DefaultComponent = ImageBackground;
            ImageComponent = AnimatedImageBackground;
        } else {
            DefaultComponent = Image;
            ImageComponent = Animated.Image;
        }

        return (
            <View {...{style}}>
                {(hasDefaultSource && !hasPreview && !hasURI) &&
                <DefaultComponent
                    {...otherProps}
                    source={defaultSource}
                    style={computedStyle}
                >
                    {this.props.children}
                </DefaultComponent>
                }
                {hasPreview && !isImageReady &&
                <ImageComponent
                    {...otherProps}
                    source={{uri: thumb}}
                    style={computedStyle}
                    blurRadius={5}
                >
                    {this.props.children}
                </ImageComponent>
                }
                {isImageReady &&
                <ImageComponent
                    {...otherProps}
                    source={{uri}}
                    style={computedStyle}
                >
                    {this.props.children}
                </ImageComponent>
                }
                {hasPreview &&
                <Animated.View style={[computedStyle, {backgroundColor: 'black', opacity}]}/>
                }
            </View>
        );
    }
}
