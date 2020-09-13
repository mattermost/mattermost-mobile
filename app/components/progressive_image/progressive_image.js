// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, ImageBackground, View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';

import thumb from '@assets/images/thumb.png';
import CustomPropTypes from '@constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

export default class ProgressiveImage extends PureComponent {
    static propTypes = {
        id: PropTypes.string,
        isBackgroundImage: PropTypes.bool,
        children: CustomPropTypes.Children,
        defaultSource: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.number]), // this should be provided by the component
        imageUri: PropTypes.string,
        imageStyle: CustomPropTypes.Style,
        onError: PropTypes.func,
        resizeMethod: PropTypes.string,
        resizeMode: PropTypes.string,
        style: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
        tintDefaultSource: PropTypes.bool,
    };

    static defaultProps = {
        style: {},
        defaultSource: undefined,
        resizeMode: 'contain',
    };

    constructor(props) {
        super(props);

        this.state = {
            intensity: new Animated.Value(0),
        };
    }

    onLoadImageEnd = () => {
        Animated.timing(this.state.intensity, {
            duration: 300,
            toValue: 100,
            useNativeDriver: true,
        }).start();
    }

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
            tintDefaultSource,
        } = this.props;

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
                        style={[StyleSheet.absoluteFill, imageStyle, tintDefaultSource ? styles.defaultImageTint : null]}
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
        const defaultOpacity = this.state.intensity.interpolate({
            inputRange: [0, 100],
            outputRange: [0.5, 0],
        });

        const containerStyle = {
            backgroundColor: changeOpacity(theme.centerChannelColor, defaultOpacity),
        };

        return (
            <Animated.View style={[styles.defaultImageContainer, style, containerStyle]}>
                <DefaultComponent
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={thumb}
                    style={[imageStyle, {tintColor: theme.centerChannelColor, opacity: defaultOpacity}]}
                />
                <ImageComponent
                    nativeID={`image-${id}`}
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri: imageUri}}
                    style={[StyleSheet.absoluteFill, imageStyle, {opacity}]}
                    onLoadEnd={this.onLoadImageEnd}
                >
                    {this.props.children}
                </ImageComponent>
            </Animated.View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        defaultImageContainer: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        defaultImageTint: {
            flex: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});
