// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import moment from 'moment-timezone';

import CustomPropTypes from 'app/constants/custom_prop_types';

class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        timeZone: PropTypes.string,
        children: PropTypes.func,
        hour12: PropTypes.bool,
        style: CustomPropTypes.Style,
        intl: intlShape.isRequired,
    };

    getFormattedTime = () => {
        const {
            value,
            timeZone,
            hour12,
            intl,
        } = this.props;

        const timezoneProps = timeZone ? {timeZone} : {};
        const options = {
            ...timezoneProps,
            hour12,
        };
        const formattedTime = intl.formatTime(value, options);

        // `formatTime` returns unformatted date string on error like in the case of (react-intl) unsupported timezone.
        // Therefore, use react-intl by default or moment-timezone for unsupported timezone.
        if (formattedTime !== String(new Date(value))) {
            return formattedTime;
        }

        const format = hour12 ? 'hh:mm A' : 'HH:mm';
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

export default injectIntl(FormattedTime);
