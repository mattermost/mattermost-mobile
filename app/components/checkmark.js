// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Svg, {Path} from 'react-native-svg';

export default class CheckMark extends PureComponent {
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
                viewBox='0 0 12 12'
            >
                <Path
                    d='M11.667 1.756l-0.775-0.624c-0.382-0.307-0.604-0.304-0.932 0.101l-5.636 6.955 -2.623-2.179c-0.362-0.304-0.588-0.288-0.886 0.084l-0.598 0.779c-0.304 0.382-0.265 0.599 0.094 0.899l3.738 3.092c0.385 0.323 0.602 0.291 0.899-0.071l6.817-8.104c0.32-0.385 0.3-0.615-0.098-0.932Z'
                    fill={this.props.color}
                />
            </Svg>
        );
    }
}
