// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {Text} from 'react-native';

class FormattedTime extends React.PureComponent {
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

        const formattedTime = intl.formatDate(value, {...props, hour: 'numeric', minute: 'numeric'});

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}

export default injectIntl(FormattedTime);
