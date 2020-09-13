// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Animated, ImageBackground, View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';

import FileAttachmentIcon from '@components/file_attachment_list/file_attachment_icon';
import CustomPropTypes from '@constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

export default class ProgressiveImage extends PureComponent {
    static propTypes = {
        isBackgroundImage: PropTypes.bool,
        isSmallImage: PropTypes.bool,
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
        backgroundColor: PropTypes.string,
    };

    static defaultProps = {
        style: {},
        defaultSource: undefined,
        resizeMode: 'contain',
        backgroundColor: 'transparent',
    };

    constructor(props) {
        super(props);

        this.state = {
            intensity: new Animated.Value(0),
            imageLoaded: false,
        };
    }

    onLoadImageEnd = () => {
        this.setState({imageLoaded: true});
        Animated.timing(this.state.intensity, {
            duration: 300,
            toValue: 100,
            useNativeDriver: true,
        }).start();
    }

    render() {
        const {
            defaultSource,
            imageStyle,
            imageUri,
            isBackgroundImage,
            isSmallImage,
            onError,
            resizeMode,
            resizeMethod,
            style,
            theme,
            tintDefaultSource,
            backgroundColor,
        } = this.props;

        const styles = getStyleSheet(theme);

        if (isBackgroundImage) {
            return (
                <View style={[styles.defaultImageContainer, style]}>
                    <ImageBackground
                        source={{uri: imageUri}}
                        resizeMode={'cover'}
                        style={[StyleSheet.absoluteFill, imageStyle]}
                    >
                        {this.props.children}
                    </ImageBackground>
                </View>
            );
        }

        if (defaultSource) {
            return (
                <View style={[styles.defaultImageContainer, style]}>
                    <Animated.Image
                        source={defaultSource}
                        style={[StyleSheet.absoluteFill, imageStyle, tintDefaultSource ? styles.defaultImageTint : null]}
                        resizeMode={resizeMode}
                        resizeMethod={resizeMethod}
                        onError={onError}
                    >
                        {this.props.children}
                    </Animated.Image>
                </View>
            );
        }

        const opacity = this.state.intensity.interpolate({
            inputRange: [20, 100],
            outputRange: [0.2, 1],
        });

        const iconColor = changeOpacity(theme.centerChannelColor, 0.32);
        let iconSize;
        let containerStyle;
        if (isSmallImage) {
            iconSize = 24;
            containerStyle = {
                width: iconSize,
                height: iconSize,
            };
        } else {
            containerStyle = {backgroundColor: changeOpacity(theme.centerChannelColor, 0.08)};
        }

        return (
            <Animated.View style={[styles.defaultImageContainer, style, containerStyle]}>
                {!this.state.imageLoaded &&
                <FileAttachmentIcon
                    defaultImage={true}
                    smallImage={isSmallImage}
                    iconColor={iconColor}
                    iconSize={iconSize}
                    backgroundColor={backgroundColor}
                    theme={theme}
                />
                }
                <AnimatedFastImage
                    resizeMode={resizeMode}
                    resizeMethod={resizeMethod}
                    onError={onError}
                    source={{uri: imageUri}}
                    style={[StyleSheet.absoluteFill, imageStyle, {opacity}]}
                    onLoadEnd={this.onLoadImageEnd}
                >
                    {this.props.children}
                </AnimatedFastImage>
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
