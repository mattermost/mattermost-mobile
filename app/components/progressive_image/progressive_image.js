// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, Image, ImageBackground, Platform, View, StyleSheet} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {changeOpacity} from 'app/utils/theme';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export default class ProgressiveImage extends PureComponent {
    static propTypes = {
        isBackgroundImage: PropTypes.bool,
        children: CustomPropTypes.Children,
        defaultSource: PropTypes.oneOfType([PropTypes.object, PropTypes.number]), // this should be provided by the component
        filename: PropTypes.string,
        imageUri: PropTypes.string,
        onError: PropTypes.func,
        resizeMethod: PropTypes.string,
        resizeMode: PropTypes.string,
        style: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
        thumbnailUri: PropTypes.string,
        tintDefaultSource: PropTypes.bool,
    };

    static defaultProps = {
        style: {},
    };

    constructor(props) {
        super(props);

        this.subscribedToCache = true;

        this.state = {
            intensity: new Animated.Value(80),
            thumb: null,
            uri: null,
        };
    }

    componentDidMount() {
        this.load();
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.filename !== prevProps.filename ||
            this.props.imageUri !== prevProps.imageUri ||
            this.props.thumbnailUri !== prevProps.thumbnailUri) {
            this.load();
        }

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

    load = () => {
        const {filename, imageUri, thumbnailUri} = this.props;

        if (thumbnailUri) {
            ImageCacheManager.cache(filename, thumbnailUri, this.setThumbnail);
        } else if (imageUri) {
            ImageCacheManager.cache(filename, imageUri, this.setImage);
        }
    };

    setImage = (uri) => {
        if (this.subscribedToCache) {
            this.setState({uri});
        }
    };

    setThumbnail = (thumb) => {
        if (this.subscribedToCache) {
            const {filename, imageUri} = this.props;
            this.setState({thumb}, () => {
                setTimeout(() => {
                    ImageCacheManager.cache(filename, imageUri, this.setImage);
                }, 300);
            });
        }
    };

    render() {
        const {style, defaultSource, isBackgroundImage, theme, tintDefaultSource, onError, resizeMode, resizeMethod} = this.props;
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

        let defaultImage;
        if (hasDefaultSource && tintDefaultSource) {
            defaultImage = (
                <View style={styles.defaultImageContainer}>
                    <DefaultComponent
                        source={defaultSource}
                        style={{flex: 1, tintColor: changeOpacity(theme.centerChannelColor, 0.2)}}
                        resizeMode='center'
                        resizeMethod={resizeMethod}
                        onError={onError}
                    >
                        {this.props.children}
                    </DefaultComponent>
                </View>
            );
        } else {
            defaultImage = (
                <DefaultComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={defaultSource}
                    style={StyleSheet.absoluteFill}
                >
                    {this.props.children}
                </DefaultComponent>
            );
        }

        return (
            <View style={style}>
                {(hasDefaultSource && !hasPreview && !hasURI) && defaultImage}
                {hasPreview && !isImageReady &&
                <ImageComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri: thumb}}
                    style={StyleSheet.absoluteFill}
                    blurRadius={5}
                >
                    {this.props.children}
                </ImageComponent>
                }
                {isImageReady &&
                <ImageComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri}}
                    style={[StyleSheet.absoluteFill, styles.attachmentMargin]}
                >
                    {this.props.children}
                </ImageComponent>
                }
                {hasPreview &&
                <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: theme.centerChannelBg, opacity}]}/>
                }
            </View>
        );
    }
}

const styles = StyleSheet.create({
    defaultImageContainer: {
        flex: 1,
        position: 'absolute',
        height: 80,
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachmentMargin: {
        marginTop:2.5,
        marginLeft:2.5,
        marginBottom: 5,
        marginRight: 5,
    }
});
