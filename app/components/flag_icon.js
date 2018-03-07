// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Svg, {Path, G} from 'react-native-svg';

export default class FlagIcon extends PureComponent {
    static propTypes = {
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
    };

    render() {
        return (
            <Svg
                width={this.props.width}
                height={this.props.height}
                viewBox='0 0 16 16'
            >
                <G fill={this.props.color}>
                    <Path
                        d='M8,1 L2,1 C2,0.447 1.553,0 1,0 C0.447,0 0,0.447 0,1 L0,15.5 C0,15.776 0.224,16 0.5,16 L1.5,16 C1.776,16 2,15.776 2,15.5 L2,11 L7,11 L7,12 C7,12.553 7.447,13 8,13 L15,13 C15.553,13 16,12.553 16,12 L16,4 C16,3.447 15.553,3 15,3 L9,3 L9,2 C9,1.447 8.553,1 8,1 Z'
                        fill={this.props.color}
                    />
                </G>
            </Svg>
        );
    }
}