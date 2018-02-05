// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import 'date-time-format-timezone/build/src/date-time-format-timezone-all-zones-no-locale';
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

    render() {
        const {
            value,
            children,
            timeZone,
            ...props
        } = this.props;
        const {intl} = this.context;

        const timezoneProps = timeZone ? {timeZone} : {};
        const formattedTime = intl.formatDate(value, {...props, ...timezoneProps, hour: 'numeric', minute: 'numeric'});

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}
