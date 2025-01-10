// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import DraftEmptyComponent from './draft_empty_component';

describe('Draft Empty Component', () => {
    it('should match the snapshot', () => {
        const wrapper = renderWithIntlAndTheme(
            <DraftEmptyComponent/>,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render empty draft message', () => {
        const wrapper = renderWithIntlAndTheme(
            <DraftEmptyComponent/>,
        );
        expect(wrapper.getByText('No drafts at the moment')).toBeTruthy();
        expect(wrapper.getByText('Any message you have started will show here.')).toBeTruthy();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
