// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import CompassIcon from '@components/compass_icon';
import FastImage, {FastImageProps} from 'react-native-fast-image';
import validator from 'validator';
import {StyleSheet, View} from 'react-native';

export const FAST_IMAGE_MAX_RETRIES = 3;

interface RetriableFastImageState {
    retries: number,
}

interface RetriableFastImageProps extends FastImageProps {
    id: string
    retry?: boolean
    renderErrorImage?: boolean
    errorImageSize?: number
}

export default class RetriableFastImage extends PureComponent<RetriableFastImageProps, RetriableFastImageState> {
    state = {
        retries: 0,
    }

    config: validator.IsURLOptions = {
        protocols: ['file', 'http', 'https', 'content', 'data'],
        require_host: false,
        require_tld: false,
        require_valid_protocol: true,
        require_protocol: true,
        allow_underscores: true,
        allow_trailing_dot: true,
    };

    // Checks if given URI is valid
    isValidUri = this.props.source && typeof this.props.source != 'number' && this.props.source.uri ? validator.isURL(this.props.source.uri, this.config) || validator.isDataURI(this.props.source.uri) : false;

    styles = StyleSheet.create({
        iconView: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            alignContent: 'center',
            height: '100%',
        },
    })

    onError = () => {
        const retryCount = this.state.retries + 1;
        if (!this.isValidUri || retryCount > FAST_IMAGE_MAX_RETRIES) {
            if (this.props.onError) {
                this.props.onError();
            }
            return;
        }

        this.setState({retries: retryCount});
    }

    render() {
        if (this.isValidUri) {
            return (
                <FastImage
                    key={`${this.props.id}-${this.state.retries}`}
                    onError={this.onError}
                    {...this.props}
                />
            );
        }

        if (this.props.renderErrorImage) {
            return (
                <View style={this.styles.iconView}>
                    <CompassIcon
                        name='jumbo-attachment-image-broken'
                        size={this.props.errorImageSize || 20}
                    />
                </View>
            );
        }

        return null;
    }
}
