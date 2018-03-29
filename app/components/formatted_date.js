// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {Text} from 'react-native';

class FormattedDate extends React.PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        value: PropTypes.any.isRequired,
        format: PropTypes.string,
        children: PropTypes.func,
    };

    render() {
        const {
            intl,
            value,
            children,
            ...props
        } = this.props;

        Reflect.deleteProperty(props, 'format');

        const formattedDate = intl.formatDate(value, this.props);

        if (typeof children === 'function') {
            return children(formattedDate);
        }

        return <Text {...props}>{formattedDate}</Text>;
    }
}

export default injectIntl(FormattedDate);
