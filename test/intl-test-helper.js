// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlProvider, intlShape} from 'react-intl';
import {mount, shallow} from 'enzyme';

const intlProvider = new IntlProvider({locale: 'en'}, {});
const {intl} = intlProvider.getChildContext();

export function shallowWithIntl(node, {context} = {}) {
    return shallow(React.cloneElement(node, {intl}), {
        context: Object.assign({}, context, {intl}),
    });
}

export function mountWithIntl(node, {context, childContextTypes} = {}) {
    return mount(React.cloneElement(node, {intl}), {
        context: Object.assign({}, context, {intl}),
        childContextTypes: Object.assign({}, {intl: intlShape}, childContextTypes),
    });
}
