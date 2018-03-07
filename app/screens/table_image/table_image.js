// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

export default class TableImage extends React.PureComponent {
    static propTypes = {
        deviceWidth: PropTypes.number.isRequired,
        imageSource: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            width: -1,
            height: -1,
        };
    }

    componentWillMount() {
        this.getImageSize(this.props.imageSource);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.imageSource !== nextProps.imageSource) {
            this.setState({
                width: -1,
                height: -1,
            });

            this.getImageSize(nextProps.imageSource);
        }
    }

    getImageSize = (imageSource) => {
        Image.getSize(imageSource, (width, height) => {
            this.setState({
                width,
                height,
            });
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
                <Image
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
