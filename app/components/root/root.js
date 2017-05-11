// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {IntlProvider} from 'react-intl';

import {getTranslations} from 'app/i18n';

export default class Root extends Component {
    static propTypes = {
        children: PropTypes.node,
        locale: PropTypes.string.isRequired
    };

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                {this.props.children}
            </IntlProvider>
        );
    }
}
