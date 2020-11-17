// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {shallowWithIntl} from 'test/intl-test-helper';

import SearchResultPost from './search_result_post';

describe('SearchResultPost', () => {
    const baseProps = {
        goToThread: jest.fn(),
        onHashtagPress: jest.fn(),
        onPermalinkPress: jest.fn(),
        previewPost: jest.fn(),
        postId: 'post-id',
        isDeleted: false,
        highlightPinnedOrFlagged: false,
        managedConfig: {},
        showFullDate: false,
        skipFlaggedHeader: false,
        skipPinnedHeader: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallowWithIntl(<SearchResultPost {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
