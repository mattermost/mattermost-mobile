// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import moment from 'moment-timezone';

export default class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        timeZone: PropTypes.string,
        children: PropTypes.func,
        hour12: PropTypes.bool,
    };

    getFormattedTime = () => {
        const {
            value,
            timeZone,
            hour12,
        } = this.props;

        const format = hour12 ? 'hh:mm A' : 'HH:mm';
        if (timeZone) {
            return moment.tz(value, timeZone).format(format);
        }

        return moment(value).format(format);
    };

    render() {
        const {children} = this.props;
        const formattedTime = this.getFormattedTime();

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}
