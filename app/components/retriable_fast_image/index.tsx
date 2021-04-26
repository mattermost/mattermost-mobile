// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import CompassIcon from '@components/compass_icon';
import FastImage, {FastImageProps} from 'react-native-fast-image';
import validator from 'validator';

export const FAST_IMAGE_MAX_RETRIES = 3;

type RetriableFastImageProps = FastImageProps & {
    id?: string
    renderOnError?: boolean
}

type RetriableFastImageState = {
    retry: number,
}

export default class RetriableFastImage extends PureComponent<RetriableFastImageProps, RetriableFastImageState> {
    config: validator.IsURLOptions = {
        protocols: ['file', 'http', 'https', 'content', 'data'],
        require_host: false,
        require_tld: false,
        require_valid_protocol: true,
        require_protocol: true,
        allow_underscores: true,
        allow_trailing_dot: true,
    };

    state = {
        retry: 0,
    }

    onError = () => {
        const retry = this.state.retry + 1;
        if (retry > FAST_IMAGE_MAX_RETRIES && this.props.onError) {
            this.props.onError();
            return;
        }

        this.setState({retry});
    }

    render() {
        const valid = this.props.source && typeof this.props.source != 'number' && this.props.source.uri ? validator.isURL(this.props.source.uri, this.config) || validator.isDataURI(this.props.source.uri) : false;
        if (valid) {
            return (
                <FastImage
                    key={`${this.props.id}-${this.state.retry}`}
                    onError={this.onError}
                    {...this.props}
                />
            );
        }

        if (this.props.renderOnError) {
            return (
                <CompassIcon
                    name='jumbo-attachment-image-broken'
                />);
        }

        return null;
    }
}
