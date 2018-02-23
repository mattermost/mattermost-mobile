// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Svg, {Path} from 'react-native-svg';

export default class PaperPlane extends PureComponent {
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
                viewBox='0 0 16 14'
            >
                <Path
                    d='M1.09222552,5.76354703 L0.405413926,0.94983436 C0.379442059,0.7702001 0.452067095,0.59056584 0.594431403,0.479386798 C0.737276671,0.368693254 0.927737029,0.343932856 1.09318744,0.414815564 C3.7432798,1.54942439 12.1192069,5.13676911 15.0920238,6.40974487 C15.2723839,6.48693905 15.3892573,6.66560231 15.3892573,6.8632 C15.3892573,7.06079769 15.2723839,7.23946095 15.0920238,7.31665513 C12.0961208,8.59982635 3.6105347,12.2337789 1.0316245,13.3378013 C0.878198098,13.4033436 0.701685594,13.3810106 0.569902417,13.2785706 C0.43763828,13.1761305 0.37030381,13.0096047 0.393870874,12.8430789 L1.07875863,7.96479496 L8.93669128,6.8632 L1.09222552,5.76354703 Z'
                    fill={this.props.color}
                />
            </Svg>
        );
    }
}
