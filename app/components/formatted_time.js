// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';
import moment from 'moment-timezone';

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
            return intl.formatDate(moment.tz(value, timeZone).toDate(), {
                hour: 'numeric',
                minute: 'numeric',
                hour12,
            });
        }

        // If no timezone is defined fallback to the previous implementation
        return intl.formatDate(new Date(value), {
            hour: 'numeric',
            minute: 'numeric',
            hour12,
        });
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
