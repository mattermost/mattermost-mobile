// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Svg, {
    Ellipse,
    G,
    Path,
} from 'react-native-svg';

export default class DndAvatar extends PureComponent {
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
                        <Ellipse
                            cx='-294.6'
                            cy='394'
                            rx='2.5'
                            ry='2.5'
                            fill={color}
                        />
                        <Path
                            d='M-293.8,399.4c0-0.4,0.1-0.7,0.2-1c-0.3,0.1-0.6,0.2-1,0.2c-2.5,0-2.5-2-2.5-2s-1,0.1-1.2,0.5c-0.4,0.6-0.6,1.7-0.7,2.5 c0,0.1-0.1,0.5,0,0.6c0.2,1.3,2.2,2.3,4.4,2.4c0,0,0.1,0,0.1,0c0,0,0.1,0,0.1,0c0.7,0,1.4-0.1,2-0.3 C-293.3,401.5-293.8,400.5-293.8,399.4z'
                            fill={color}
                        />
                    </G>
                    <Path
                        d='M-287,400c0,0.1-0.1,0.1-0.1,0.1l-4.9,0c-0.1,0-0.1-0.1-0.1-0.1v-1.6c0-0.1,0.1-0.1,0.1-0.1l4.9,0c0.1,0,0.1,0.1,0.1,0.1 V400z'
                        fill={color}
                    />
                </Svg>
            </View>
        );
    }
}
