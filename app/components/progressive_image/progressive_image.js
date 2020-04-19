// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, ImageBackground, Platform, View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';

import {Client4} from '@mm-redux/client';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {isTrustedHost} from 'app/utils/network';
import EphemeralStore from 'app/store/ephemeral_store';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedImage = Animated.createAnimatedComponent(FastImage);

export default class ProgressiveImage extends PureComponent {
    static propTypes = {
        isBackgroundImage: PropTypes.bool,
        children: CustomPropTypes.Children,
        defaultSource: PropTypes.oneOfType([PropTypes.object, PropTypes.number]), // this should be provided by the component
        filename: PropTypes.string,
        imageUri: PropTypes.string,
        imageStyle: CustomPropTypes.Style,
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
            failedImageLoad: false,
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
        const {imageUri, thumbnailUri} = this.props;

        if (thumbnailUri) {
            this.setThumbnail(thumbnailUri);
        } else if (imageUri) {
            this.setImage(imageUri);
        }
    };

    loadFullImage = () => {
        if (!this.state.uri) {
            const {imageUri} = this.props;
            this.setImage(imageUri);
        }
    }

    setImage = (uri) => {
        if (this.subscribedToCache) {
            this.setState({uri});
        }
    };

    setThumbnail = (thumb) => {
        if (this.subscribedToCache) {
            if (!thumb && !this.state.failedImageLoad) {
                this.load();
                this.setState({failedImageLoad: true});
            } else {
                this.setState({thumb, uri: null});
            }
        }
    };

    render() {
        const {
            defaultSource,
            imageStyle,
            isBackgroundImage,
            onError,
            resizeMode,
            resizeMethod,
            style,
            theme,
            tintDefaultSource,
        } = this.props;
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
            DefaultComponent = FastImage;
            ImageComponent = AnimatedImage;
        }

        const styles = getStyleSheet(theme);

        let defaultImage;
        if (hasDefaultSource && tintDefaultSource) {
            defaultImage = (
                <View style={styles.defaultImageContainer}>
                    <DefaultComponent
                        source={defaultSource}
                        style={styles.defaultImageTint}
                        resizeMode='center'
                        resizeMethod={resizeMethod}
                        onError={onError}
                        trustSSL={isTrustedHost()}
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
                    style={[StyleSheet.absoluteFill, imageStyle]}
                    trustSSL={isTrustedHost()}
                >
                    {this.props.children}
                </DefaultComponent>
            );
        }

        if (hasDefaultSource && !hasPreview && !hasURI) {
            return (
                <View style={style}>
                    {defaultImage}
                    {hasPreview &&
                    <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: theme.centerChannelBg, opacity}]}/>
                    }
                </View>
            );
        }

        let source;
        if (hasPreview && !isImageReady) {
            source = {uri: thumb};
        } else if (isImageReady) {
            source = {uri};
        }

        return (
            <View style={style}>
                {source &&
                <ImageComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={source}
                    style={[StyleSheet.absoluteFill, imageStyle]}
                    blurRadius={isImageReady ? null : 5}
                    onLoadEnd={this.loadFullImage}
                    trustSSL={isTrustedHost()}
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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        defaultImageContainer: {
            flex: 1,
            position: 'absolute',
            height: 80,
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
        },
        defaultImageTint: {
            flex: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});
