// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {TouchableOpacity} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class ConditionalTouchable extends React.PureComponent {
    static propTypes = {
        touchable: PropTypes.bool,
        children: CustomPropTypes.Children.isRequired,
    };

    render() {
        const {touchable, children, ...otherProps} = this.props;

        if (touchable) {
            return (
                <TouchableOpacity {...otherProps}>
                    {children}
                </TouchableOpacity>
            );
        }

        return React.Children.only(children);
    }
}
