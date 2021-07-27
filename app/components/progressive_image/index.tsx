// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withTheme} from '@context/theme';
import React, {PureComponent, ReactNode} from 'react';
import {Animated, Image, ImageBackground, ImageResizeMode, ImageSourcePropType, ImageStyle, Platform, StyleSheet, View, ViewStyle} from 'react-native';

import RetriableFastImage from '@components/retriable_fast_image';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedFastImage = Animated.createAnimatedComponent(RetriableFastImage);

type ProgressiveImageProps = {
    children: ReactNode | ReactNode[];
    defaultSource: ImageSourcePropType; // this should be provided by the component
    id: string;
    imageStyle: ImageStyle;
    imageUri: string;
    inViewPort: boolean;
    isBackgroundImage: boolean;
    onError: () => void;
    resizeMethod: 'auto' | 'resize' | 'scale' | undefined;
    resizeMode: ImageResizeMode;
    style: ViewStyle;
    theme: Theme;
    thumbnailUri: string;
    tintDefaultSource: boolean;
};

type ProgressiveImageState = {
    intensity: Animated.Value;
    showHighResImage: boolean;
};

class ProgressiveImage extends PureComponent<ProgressiveImageProps, ProgressiveImageState> {
    static defaultProps = {
        style: {},
        defaultSource: undefined,
        resizeMode: 'contain' as ImageResizeMode,
    };

    constructor(props: ProgressiveImageProps) {
        super(props);

        this.state = {
            intensity: new Animated.Value(0),
            showHighResImage: false,
        };
    }

    componentDidUpdate(prevProps: ProgressiveImageProps) {
        if (
            prevProps.inViewPort !== this.props.inViewPort &&
            this.props.inViewPort
        ) {
            this.startLoadingOriginalImage();
        }
    }

    startLoadingOriginalImage = () => {
        this.setState({
            showHighResImage: true,
        });
    };

    onLoadImageEnd = () => {
        Animated.timing(this.state.intensity, {
            duration: 300,
            toValue: 100,
            useNativeDriver: true,
        }).start();
    };

    render() {
        const {
            defaultSource,
            id,
            imageStyle,
            imageUri,
            isBackgroundImage,
            onError,
            resizeMode,
            resizeMethod,
            style,
            theme,
            thumbnailUri,
            tintDefaultSource,
        } = this.props;

        const {showHighResImage} = this.state;

        let DefaultComponent;
        let ImageComponent;
        if (isBackgroundImage) {
            DefaultComponent = ImageBackground;
            ImageComponent = AnimatedImageBackground;
        } else {
            DefaultComponent = AnimatedFastImage;
            ImageComponent = AnimatedFastImage;
        }

        const styles = getStyleSheet(theme);

        if (isBackgroundImage) {
            return (
                <View style={[styles.defaultImageContainer, style]}>
                    <DefaultComponent
                        id={id}
                        source={{uri: imageUri}}
                        resizeMode={'cover'}
                        style={[StyleSheet.absoluteFill, imageStyle]}
                    >
                        {this.props.children}
                    </DefaultComponent>
                </View>
            );
        }

        if (defaultSource) {
            return (
                <View style={[styles.defaultImageContainer, style]}>
                    <DefaultComponent
                        source={defaultSource}
                        style={[
                            StyleSheet.absoluteFill,
                            imageStyle,
                            tintDefaultSource ? styles.defaultImageTint : null,
                        ]}
                        resizeMode={resizeMode}
                        resizeMethod={resizeMethod}
                        onError={onError}
                        nativeID={`image-${id}`}
                    >
                        {this.props.children}
                    </DefaultComponent>
                </View>
            );
        }

        const opacity = this.state.intensity.interpolate({
            inputRange: [20, 100],
            outputRange: [0.2, 1],
        });

        const defaultOpacity = this.state.intensity.interpolate({inputRange: [0, 100], outputRange: [0.5, 0]});

        const containerStyle = {backgroundColor: changeOpacity(theme.centerChannelColor, Number(defaultOpacity))};

        let thumbnail;
        let image;
        if (thumbnailUri) {
            const ImageElement = thumbnailUri.startsWith('data:') ? Image : ImageComponent;

            thumbnail = (
                <ImageElement
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri: thumbnailUri}}
                    style={[StyleSheet.absoluteFill, imageStyle]}
                    blurRadius={Platform.OS === 'android' ? 0.4 : 1}
                    testID='progressive_image.miniPreview'
                >
                    {this.props.children}
                </ImageElement>
            );

            if (showHighResImage) {
                image = (
                    <ImageComponent
                        nativeID={`image-${id}`}
                        resizeMode={resizeMode}
                        resizeMethod={resizeMethod}
                        onError={onError}
                        source={{uri: imageUri}}
                        style={[
                            StyleSheet.absoluteFill,
                            imageStyle,
                            {opacity},
                        ]}
                        testID='progressive_image.highResImage'
                        onLoadEnd={this.onLoadImageEnd}
                    >
                        {this.props.children}
                    </ImageComponent>
                );
            }
        } else {
            thumbnail = (
                <DefaultComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={require('@assets/images/thumb.png')}
                    style={[
                        imageStyle,
                        {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            tintColor: theme.centerChannelColor,
                            opacity: defaultOpacity,
                        },
                    ]}
                    testID='progressive_image.thumbnail'
                />
            );

            image = (
                <ImageComponent
                    nativeID={`image-${id}`}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri: imageUri}}
                    style={[StyleSheet.absoluteFill, imageStyle, {opacity}]}
                    onLoadEnd={this.onLoadImageEnd}
                    testID='progressive_image.highResImage'
                >
                    {this.props.children}
                </ImageComponent>
            );
        }

        return (
            <Animated.View
                style={[styles.defaultImageContainer, style, containerStyle]}
            >
                {thumbnail}
                {image}
            </Animated.View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        defaultImageContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        defaultImageTint: {
            flex: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});

export default withTheme(ProgressiveImage);
