// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import FastImage from 'react-native-fast-image';

export default class TableImage extends React.PureComponent {
    static propTypes = {
        deviceWidth: PropTypes.number.isRequired,
        imagesMetadata: PropTypes.object,
        imageSource: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);

        const dimensions = props.imagesMetadata?.[props.imageSource];
        this.state = {
            imageSource: '',
            width: dimensions?.width || -1,
            height: dimensions?.height || -1,
        };
    }

    static getDerivedStateFromProps(nextProps, state) {
        if (nextProps.imageSource !== state.imageSource) {
            return {
                width: -1,
                height: -1,
            };
        }

        return null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.imageSource !== this.props.imageSource) {
            this.getImageSize();
        }
    }

    getImageSize = () => {
        const {imageSource, imagesMetadata} = this.props;
        const dimensions = imagesMetadata?.[imageSource];
        this.setState({
            width: dimensions?.width || -1,
            height: dimensions?.height || -1,
        });
    }

    render() {
        let {width, height} = this.state;

        if (width === -1 || height === -1) {
            return (
                <View style={style.loadingContainer}>
                    <ActivityIndicator
                        animating={true}
                        size='large'
                    />
                </View>
            );
        }

        if (width > this.props.deviceWidth) {
            height = (height / width) * this.props.deviceWidth;
            width = this.props.deviceWidth;
        }

        return (
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                <FastImage
                    style={[style.image, {width, height}]}
                    source={{uri: this.props.imageSource}}
                />
            </ScrollView>
        );
    }
}

const style = StyleSheet.create({
    scrollContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        flexDirection: 'column',
    },
    image: {
        resizeMode: 'contain',
    },
    loadingContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});
