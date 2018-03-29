// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

export default class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        children: PropTypes.func,
        hour12: PropTypes.bool,
    };

    render() {
        const {
            value,
            children,
            hour12,
        } = this.props;

        const date = new Date(value);
        const militaryTime = !hour12;

        const hour = militaryTime ? date.getHours() : (date.getHours() % 12 || 12);
        let minute = date.getMinutes();
        minute = minute >= 10 ? minute : ('0' + minute);
        let time = '';

        if (!militaryTime) {
            time = (date.getHours() >= 12 ? ' PM' : ' AM');
        }

        const formattedTime = hour + ':' + minute + time;

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}
