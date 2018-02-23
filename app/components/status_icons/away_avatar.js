// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Svg, {
    Circle,
    G,
    Path,
} from 'react-native-svg';

export default class AwayAvatar extends PureComponent {
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
                    viewBox='0 0 12 12'
                >
                    <G transform='matrix(1,0,0,1,299,-391)'>
                        <Circle
                            cx='-294.5'
                            cy='394'
                            r='2.5'
                            fill={color}
                        />
                        <Path
                            d='M-294.3,399.7C-294.3,399.3 -294.2,398.9 -294.1,398.5C-294.2,398.5 -294.3,398.5 -294.5,398.5C-297,398.5 -297,396.5 -297,396.5C-297,396.5 -298,396.6 -298.2,397C-298.6,397.6 -298.8,398.7 -298.9,399.5C-298.9,399.6 -299,400 -298.9,400.1C-298.7,401.4 -296.7,402.4 -294.5,402.5L-294.3,402.5C-294,402.5 -293.6,402.5 -293.3,402.4C-293.9,401.6 -294.3,400.7 -294.3,399.7Z'
                            fill={color}
                        />
                    </G>
                    <Path
                        d='M8.415,5C8.614,5 8.775,5.161 8.775,5.36L8.775,8.352L11.49,10.334C11.651,10.451 11.686,10.677 11.569,10.837L10.932,11.709C10.814,11.87 10.589,11.905 10.429,11.788L7.261,9.475C7.243,9.463 7.226,9.451 7.21,9.437L7.123,9.374C7.009,9.291 6.959,9.154 6.98,9.024C6.977,8.999 6.975,8.973 6.975,8.946L6.975,5.36C6.975,5.161 7.137,5 7.335,5L8.415,5Z'
                        fill={color}
                    />
                </Svg>
            </View>
        );
    }
}
