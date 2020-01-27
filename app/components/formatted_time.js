// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import moment from 'moment-timezone';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        timeZone: PropTypes.string,
        children: PropTypes.func,
        hour12: PropTypes.bool,
        style: CustomPropTypes.Style,
    };

    getFormattedTime = () => {
        const {
            value,
            timeZone,
            hour12,
        } = this.props;

        let format = 'H:mm';
        if (hour12) {
            const localeFormat = moment.localeData().longDateFormat('LT');
            format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
        }

        if (timeZone) {
            return moment.tz(value, timeZone).format(format);
        }

        return moment(value).format(format);
    };

    render() {
        const {children, style} = this.props;
        const formattedTime = this.getFormattedTime();

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text style={style}>{formattedTime}</Text>;
    }
}
