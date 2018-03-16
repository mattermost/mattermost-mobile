// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    Animated,
    View,
    Image,
    StyleSheet,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import imageIcon from 'assets/images/icons/image.png';

const {View: AnimatedView} = Animated;

const IMAGE_SIZE = {
    Fullsize: 'fullsize',
    Preview: 'preview',
    Thumbnail: 'thumbnail',
};

export default class FileAttachmentImage extends PureComponent {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object,
        imageHeight: PropTypes.number,
        imageSize: PropTypes.oneOf([
            IMAGE_SIZE.Fullsize,
            IMAGE_SIZE.Preview,
            IMAGE_SIZE.Thumbnail,
        ]),
        imageWidth: PropTypes.number,
        loadingBackgroundColor: PropTypes.string,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperBackgroundColor: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
    };

    static defaultProps = {
        fadeInOnLoad: false,
        imageHeight: 80,
        imageSize: IMAGE_SIZE.Preview,
        imageWidth: 80,
        loading: false,
        loadingBackgroundColor: '#fff',
        resizeMode: 'cover',
        resizeMethod: 'resize',
        wrapperBackgroundColor: '#fff',
        wrapperHeigh: 80,
        wrapperWidth: 80,
    };

    state = {
        opacity: new Animated.Value(0),
        requesting: true,
        retry: 0,
    };

    // Sometimes the request after a file upload errors out.
    // We'll up to three times to get the image.
    // We have to add a timestamp so fetch will retry the call.
    handleLoadError = () => {
        if (this.state.retry < 4) {
            setTimeout(() => {
                this.setState({
                    retry: (this.state.retry + 1),
                    timestamp: Date.now(),
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
        const {file, imageSize} = this.props;

        if (file.localPath && this.state.retry === 0) {
            return file.localPath;
        }

        switch (imageSize) {
        case IMAGE_SIZE.Fullsize:
            return Client4.getFileUrl(file.id, this.state.timestamp);
        case IMAGE_SIZE.Preview:
            return Client4.getFilePreviewUrl(file.id, this.state.timestamp);
        case IMAGE_SIZE.Thumbnail:
        default:
            return Client4.getFileThumbnailUrl(file.id, this.state.timestamp);
        }
    };

    calculateNeededWidth = (height, width, newHeight) => {
        const ratio = width / height;

        let newWidth = newHeight * ratio;
        if (newWidth < newHeight) {
            newWidth = newHeight;
        }

        return newWidth;
    };

    render() {
        const {
            fetchCache,
            file,
            imageHeight,
            imageWidth,
            imageSize,
            loadingBackgroundColor,
            resizeMethod,
            resizeMode,
            wrapperBackgroundColor,
            wrapperHeight,
            wrapperWidth,
        } = this.props;

        let source = {};

        if (this.state.retry === 4) {
            source = imageIcon;
        } else if (file.id) {
            source = {uri: this.handleGetImageURL()};
        } else if (file.failed) {
            source = {uri: file.localPath};
        }

        const isInFetchCache = fetchCache[source.uri];

        const imageComponentLoaders = {
            onError: isInFetchCache ? null : this.handleLoadError,
            onLoadStart: isInFetchCache ? null : this.handleLoadStart,
            onLoad: isInFetchCache ? null : this.handleLoad,
        };
        const opacity = isInFetchCache ? 1 : this.state.opacity;

        let height = imageHeight;
        let width = imageWidth;
        let imageStyle = {height, width};
        if (imageSize === IMAGE_SIZE.Preview) {
            height = 80;
            width = this.calculateNeededWidth(file.height, file.width, height);
            imageStyle = {height, width, position: 'absolute', top: 0, left: 0, borderBottomLeftRadius: 2, borderTopLeftRadius: 2};
        }

        return (
            <View style={[style.fileImageWrapper, {backgroundColor: wrapperBackgroundColor, height: wrapperHeight, width: wrapperWidth, overflow: 'hidden'}]}>
                <AnimatedView style={{height: imageHeight, width: imageWidth, backgroundColor: wrapperBackgroundColor, opacity}}>
                    <Image
                        style={imageStyle}
                        source={source}
                        resizeMode={resizeMode}
                        resizeMethod={resizeMethod}
                        {...imageComponentLoaders}
                    />
                </AnimatedView>
                {(!isInFetchCache && !file.failed && (file.loading || this.state.requesting)) &&
                <View style={[style.loaderContainer, {backgroundColor: loadingBackgroundColor}]}>
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
        borderBottomLeftRadius: 2,
        borderTopLeftRadius: 2,
    },
    loaderContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
