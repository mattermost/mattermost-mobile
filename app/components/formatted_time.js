// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';

export default class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        timeZone: PropTypes.string,
        children: PropTypes.func,
        hour12: PropTypes.bool,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    getFormattedTime = () => {
        const {intl} = this.context;

        const {
            value,
            timeZone,
            hour12,
        } = this.props;

        if (timeZone) {
            return intl.formatDate(value, {
                timeZone,
                hour: 'numeric',
                minute: 'numeric',
                hour12,
            });
        }

        // If no timezone is defined fallback to the previous implementation
        const date = new Date(value);
        const militaryTime = !hour12;
        const hour = militaryTime ? date.getHours() : (date.getHours() % 12 || 12);
        let minute = date.getMinutes();
        minute = minute >= 10 ? minute : ('0' + minute);
        let time = '';
        if (!militaryTime) {
            time = (date.getHours() >= 12 ? ' PM' : ' AM');
        }

        return hour + ':' + minute + time;
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
