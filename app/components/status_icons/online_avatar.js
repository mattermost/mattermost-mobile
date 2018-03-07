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

export default class OnlineStatus extends PureComponent {
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
                    viewBox='-243 245 12 12'
                >
                    <G>
                        <Path
                            d='M-236,250.5C-236,250.5-236,250.5-236,250.5C-236,250.5-236,250.5-236,250.5C-236,250.5-236,250.5-236,250.5z'
                            fill={color}
                        />
                        <Ellipse
                            cx='-238.5'
                            cy='248'
                            rx='2.5'
                            ry='2.5'
                            fill={color}
                        />
                    </G>
                    <Path
                        d='M-238.9,253.8c0-0.4,0.1-0.9,0.2-1.3c-2.2-0.2-2.2-2-2.2-2s-1,0.1-1.2,0.5c-0.4,0.6-0.6,1.7-0.7,2.5c0,0.1-0.1,0.5,0,0.6 c0.2,1.3,2.2,2.3,4.4,2.4c0,0,0.1,0,0.1,0c0,0,0.1,0,0.1,0c0,0,0.1,0,0.1,0C-238.7,255.7-238.9,254.8-238.9,253.8z'
                        fill={color}
                    />
                    <G>
                        <G>
                            <Path
                                d='M-232.3,250.1l1.3,1.3c0,0,0,0.1,0,0.1l-4.1,4.1c0,0,0,0-0.1,0c0,0,0,0,0,0l-2.7-2.7c0,0,0-0.1,0-0.1l1.2-1.2 c0,0,0.1,0,0.1,0l1.4,1.4l2.9-2.9C-232.4,250.1-232.3,250.1-232.3,250.1z'
                                fill={color}
                            />
                        </G>
                    </G>
                </Svg>
            </View>
        );
    }
}
