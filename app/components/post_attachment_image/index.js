// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import ProgressiveImage from 'app/components/progressive_image';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {isGifTooLarge} from 'app/utils/images';

export default class PostAttachmentImage extends React.PureComponent {
    static propTypes = {
        height: PropTypes.number.isRequired,
        id: PropTypes.string,
        imageMetadata: PropTypes.object,
        onError: PropTypes.func.isRequired,
        onImagePress: PropTypes.func.isRequired,
        uri: PropTypes.string,
        width: PropTypes.number.isRequired,
    };

    static defaultProps = {
        frameCount: 0,
    };

    handlePress = () => {
        this.props.onImagePress();
    };

    render() {
        if (isGifTooLarge(this.props.imageMetadata)) {
            return null;
        }

        // Note that TouchableWithoutFeedback only works if its child is a View

        return (
            <TouchableWithFeedback
                onPress={this.handlePress}
                style={[styles.imageContainer, {height: this.props.height}]}
                type={'none'}
            >
                <View>
                    <ProgressiveImage
                        id={this.props.id}
                        style={[styles.image, {width: this.props.width, height: this.props.height}]}
                        imageUri={this.props.uri}
                        resizeMode='contain'
                        onError={this.props.onError}
                    />
                </View>
            </TouchableWithFeedback>
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
