// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {getTranslations} from 'i18n';
import {IntlProvider} from 'react-intl';

export default class RootLayout extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        locale: React.PropTypes.string.isRequired
    }

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
