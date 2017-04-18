// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    PropTypes,
    PureComponent
} from 'react';
import {
    ActivityIndicator,
    Animated,
    View,
    Image,
    StyleSheet
} from 'react-native';

import Client from 'mattermost-redux/client';

import imageIcon from 'assets/images/icons/image.png';

const {View: AnimatedView} = Animated;

const IMAGE_SIZE = {
    Fullsize: 'fullsize',
    Preview: 'preview',
    Thumbnail: 'thumbnail'
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
            IMAGE_SIZE.Thumbnail
        ]),
        imageWidth: PropTypes.number,
        loadingBackgroundColor: PropTypes.string,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperBackgroundColor: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number
    };

    static defaultProps = {
        fadeInOnLoad: false,
        imageHeight: 100,
        imageSize: IMAGE_SIZE.Thumbnail,
        imageWidth: 100,
        loading: false,
        loadingBackgroundColor: '#fff',
        resizeMode: 'cover',
        resizeMethod: 'resize',
        wrapperBackgroundColor: '#fff',
        wrapperHeigh: 100,
        wrapperWidth: 100
    };

    state = {
        opacity: new Animated.Value(0),
        requesting: true,
        retry: 0
    };

    // Sometimes the request after a file upload errors out.
    // We'll up to three times to get the image.
    // We have to add a timestamp so fetch will retry the call.
    handleLoadError = () => {
        if (this.state.retry < 4) {
            setTimeout(() => {
                this.setState({
                    retry: (this.state.retry + 1),
                    timestamp: Date.now()
                });
            }, 300);
        }
    };

    handleLoad = () => {
        this.setState({
            requesting: false
        });

        Animated.timing(this.state.opacity, {
            toValue: 1,
            duration: 300
        }).start(() => {
            this.props.addFileToFetchCache(this.handleGetImageURL());
        });
    };

    handleLoadStart = () => {
        this.setState({
            requesting: true
        });
    };

    handleGetImageURL = () => {
        const {file, imageSize} = this.props;

        switch (imageSize) {
        case IMAGE_SIZE.Fullsize:
            return Client.getFileUrl(file.id, this.state.timestamp);
        case IMAGE_SIZE.Preview:
            return Client.getFilePreviewUrl(file.id, this.state.timestamp);
        case IMAGE_SIZE.Thumbnail:
        default:
            return Client.getFileThumbnailUrl(file.id, this.state.timestamp);
        }
    }

    render() {
        const {
            fetchCache,
            file,
            imageHeight,
            imageWidth,
            loadingBackgroundColor,
            resizeMethod,
            resizeMode,
            wrapperBackgroundColor,
            wrapperHeight,
            wrapperWidth
        } = this.props;

        let source = {};

        if (this.state.retry === 4) {
            source = imageIcon;
        } else if (file.id) {
            source = {uri: this.handleGetImageURL()};
        }

        const isInFetchCache = fetchCache[source.uri];

        const imageComponentLoaders = {
            onError: isInFetchCache ? null : this.handleLoadError,
            onLoadStart: isInFetchCache ? null : this.handleLoadStart,
            onLoad: isInFetchCache ? null : this.handleLoad
        };
        const opacity = isInFetchCache ? 1 : this.state.opacity;

        return (
            <View style={[style.fileImageWrapper, {backgroundColor: wrapperBackgroundColor, height: wrapperHeight, width: wrapperWidth}]}>
                <AnimatedView style={{height: imageHeight, width: imageWidth, backgroundColor: wrapperBackgroundColor, opacity}}>
                    <Image
                        style={{height: imageHeight, width: imageWidth}}
                        source={source}
                        resizeMode={resizeMode}
                        resizeMethod={resizeMethod}
                        {...imageComponentLoaders}
                    />
                </AnimatedView>
                {(!isInFetchCache && (file.loading || this.state.requesting)) &&
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
        justifyContent: 'center'
    },
    loaderContainer: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
