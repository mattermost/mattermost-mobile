// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Svg, {
    Ellipse,
    G,
    Path,
} from 'react-native-svg';

export default class OfflineStatus extends PureComponent {
    static propTypes = {
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
    };

    render() {
        const {color, height, width} = this.props;
        return (
            <View style={{height, width, alignItems: 'flex-start'}}>
                <Svg
                    width={width}
                    height={height}
                    viewBox='-299 391 12 12'
                >
                    <G>
                        <G>
                            <Ellipse
                                cx='-294.5'
                                cy='394'
                                rx='2.5'
                                ry='2.5'
                                fill={color}
                            />
                            <Path
                                d='M-294.3,399.7c0-0.4,0.1-0.8,0.2-1.2c-0.1,0-0.2,0-0.4,0c-2.5,0-2.5-2-2.5-2s-1,0.1-1.2,0.5c-0.4,0.6-0.6,1.7-0.7,2.5 c0,0.1-0.1,0.5,0,0.6c0.2,1.3,2.2,2.3,4.4,2.4h0.1h0.1c0.3,0,0.7,0,1-0.1C-293.9,401.6-294.3,400.7-294.3,399.7z'
                                fill={color}
                            />
                        </G>
                    </G>
                    <G>
                        <Path
                            d='M-288.9,399.4l1.8-1.8c0.1-0.1,0.1-0.3,0-0.3l-0.7-0.7c-0.1-0.1-0.3-0.1-0.3,0l-1.8,1.8l-1.8-1.8c-0.1-0.1-0.3-0.1-0.3,0 l-0.7,0.7c-0.1,0.1-0.1,0.3,0,0.3l1.8,1.8l-1.8,1.8c-0.1,0.1-0.1,0.3,0,0.3l0.7,0.7c0.1,0.1,0.3,0.1,0.3,0l1.8-1.8l1.8,1.8 c0.1,0.1,0.3,0.1,0.3,0l0.7-0.7c0.1-0.1,0.1-0.3,0-0.3L-288.9,399.4z'
                            fill={color}
                        />
                    </G>
                </Svg>
            </View>
        );
    }
}
