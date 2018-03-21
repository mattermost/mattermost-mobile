// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Svg, {
    G,
    Path,
} from 'react-native-svg';

export default class AppIcon extends PureComponent {
    static propTypes = {
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
    };

    render() {
        return (
            <Svg
                height={this.props.height}
                width={this.props.width}
                viewBox='0 0 500 500'
            >
                <G id='XMLID_1_'>
                    <G id='XMLID_3_'>
                        <Path
                            id='XMLID_4_'
                            class='st0'
                            d='M396.9,47.7l2.6,53.1c43,47.5,60,114.8,38.6,178.1c-32,94.4-137.4,144.1-235.4,110.9 S51.1,253.1,83,158.7C104.5,95.2,159.2,52,222.5,40.5l34.2-40.4C150-2.8,49.3,63.4,13.3,169.9C-31,300.6,39.1,442.5,169.9,486.7 s272.6-25.8,316.9-156.6C522.7,223.9,483.1,110.3,396.9,47.7z'
                            fill={this.props.color}
                        />
                    </G>
                    <Path
                        id='XMLID_2_'
                        class='st0'
                        d='M335.6,204.3l-1.8-74.2l-1.5-42.7l-1-37c0,0,0.2-17.8-0.4-22c-0.1-0.9-0.4-1.6-0.7-2.2 c0-0.1-0.1-0.2-0.1-0.3c0-0.1-0.1-0.2-0.1-0.2c-0.7-1.2-1.8-2.1-3.1-2.6c-1.4-0.5-2.9-0.4-4.2,0.2c0,0-0.1,0-0.1,0 c-0.2,0.1-0.3,0.1-0.4,0.2c-0.6,0.3-1.2,0.7-1.8,1.3c-3,3-13.7,17.2-13.7,17.2l-23.2,28.8l-27.1,33l-46.5,57.8 c0,0-21.3,26.6-16.6,59.4s29.1,48.7,48,55.1c18.9,6.4,48,8.5,71.6-14.7C336.4,238.4,335.6,204.3,335.6,204.3z'
                        fill={this.props.color}
                    />
                </G>
            </Svg>
        );
    }
}
