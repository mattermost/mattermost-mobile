// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTranslations} from '@i18n';
import {render} from '@testing-library/react-native';
import React, {ReactElement} from 'react';
import {IntlProvider} from 'react-intl';

export function renderWithIntl(ui: ReactElement, {locale = 'en', ...renderOptions} = {}) {
    function Wrapper({children}: {children: ReactElement}) {
        return (
            <IntlProvider
                locale={locale}
                messages={getTranslations(locale)}
            >
                {children}
            </IntlProvider>
        );
    }

    return render(ui, {wrapper: Wrapper, ...renderOptions});
}

// eslint-disable-next-line no-duplicate-imports
export * from '@testing-library/react-native';
