// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Svg, {
    Path,
} from 'react-native-svg';

export default class ArchiveIcon extends PureComponent {
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
                    viewBox='0 0 14 14'
                >
                    <Path
                        d='M8.5 6.5q0-0.203-0.148-0.352t-0.352-0.148h-2q-0.203 0-0.352 0.148t-0.148 0.352 0.148 0.352 0.352 0.148h2q0.203 0 0.352-0.148t0.148-0.352zM13 5v7.5q0 0.203-0.148 0.352t-0.352 0.148h-11q-0.203 0-0.352-0.148t-0.148-0.352v-7.5q0-0.203 0.148-0.352t0.352-0.148h11q0.203 0 0.352 0.148t0.148 0.352zM13.5 1.5v2q0 0.203-0.148 0.352t-0.352 0.148h-12q-0.203 0-0.352-0.148t-0.148-0.352v-2q0-0.203 0.148-0.352t0.352-0.148h12q0.203 0 0.352 0.148t0.148 0.352z'
                        fill={color}
                    />
                </Svg>
            </View>
        );
    }
}
