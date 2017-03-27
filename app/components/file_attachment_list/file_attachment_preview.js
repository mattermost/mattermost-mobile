// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
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

export default class FileAttachmentPreview extends PureComponent {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object,
        imageHeight: PropTypes.number,
        imageWidth: PropTypes.number,
        resizeMode: PropTypes.string,
        resizeMethod: PropTypes.string,
        wrapperBackgroundColor: PropTypes.string,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number
    };

    static defaultProps = {
        fadeInOnLoad: false,
        imageHeight: 100,
        imageWidth: 100,
        loading: false,
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
        if (this.state.retry < 3) {
            this.setState({
                retry: (this.state.retry + 1),
                timestamp: Date.now()
            });
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
            this.props.addFileToFetchCache(Client.getFilePreviewUrl(this.props.file.id, this.state.timestamp));
        });
    };

    handleLoadStart = () => {
        this.setState({
            requesting: true
        });
    };

    render() {
        const {
            fetchCache,
            file,
            imageHeight,
            imageWidth,
            resizeMethod,
            resizeMode,
            wrapperBackgroundColor,
            wrapperHeight,
            wrapperWidth
        } = this.props;

        let source = file.id ? {uri: Client.getFilePreviewUrl(file.id, this.state.timestamp)} : {};
        if (this.state.retry === 3) {
            source = imageIcon;
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
                    <View style={style.loaderContainer}>
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
        justifyContent: 'center',
        backgroundColor: '#fff'
    }
});
