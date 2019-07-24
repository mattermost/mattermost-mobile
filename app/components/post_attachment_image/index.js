// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {StyleSheet, TouchableWithoutFeedback, View} from 'react-native';

import ProgressiveImage from 'app/components/progressive_image';
import {isGifTooLarge} from 'app/utils/images';

export default class PostAttachmentImage extends React.PureComponent {
    static propTypes = {
        height: PropTypes.number.isRequired,
        imageMetadata: PropTypes.object,
        onError: PropTypes.func.isRequired,
        onImagePress: PropTypes.func.isRequired,
        uri: PropTypes.string,
        width: PropTypes.number.isRequired,
    };

    static defaultProps = {
        frameCount: 0,
    };

    constructor(props) {
        super(props);

        this.image = React.createRef();
    }

    handlePress = () => {
        this.props.onImagePress(this.image.current);
    };

    render() {
        if (isGifTooLarge(this.props.imageMetadata)) {
            return null;
        }

        // Note that TouchableWithoutFeedback only works if its child is a View

        return (
            <TouchableWithoutFeedback
                onPress={this.handlePress}
                style={[styles.imageContainer, {height: this.props.height}]}
            >
                <View ref={this.image}>
                    <ProgressiveImage
                        style={[styles.image, {width: this.props.width, height: this.props.height}]}
                        imageUri={this.props.uri}
                        resizeMode='contain'
                        onError={this.props.onError}
                    />
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1,
    },
});
