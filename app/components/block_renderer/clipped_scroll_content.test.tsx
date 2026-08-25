// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {ScrollView, Text} from 'react-native';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ClippedScrollContent from './clipped_scroll_content';

describe('ClippedScrollContent', () => {
    const onExpand = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function renderClipped(maxHeight: number) {
        const textContent = 'Tall content';
        return renderWithIntlAndTheme(
            <ClippedScrollContent
                maxHeight={maxHeight}
                onExpand={onExpand}
                containerPadding={0}
                testID='clipped.content'
            >
                <Text>{textContent}</Text>
            </ClippedScrollContent>,
        );
    }

    it('should not show expand button when content fits within max height', () => {
        const {UNSAFE_getByType: getByType, queryByTestId} = renderClipped(500);

        fireEvent(getByType(ScrollView), 'contentSizeChange', 0, 100);

        expect(queryByTestId('clipped.content.expand.button')).toBeNull();
    });

    it('should show expand button and call onExpand when content overflows', () => {
        const {UNSAFE_getByType: getByType, getByTestId} = renderClipped(100);

        fireEvent(getByType(ScrollView), 'layout', {
            nativeEvent: {layout: {width: 300, height: 100, x: 0, y: 0}},
        });
        fireEvent(getByType(ScrollView), 'contentSizeChange', 0, 250);

        fireEvent.press(getByTestId('clipped.content.expand.button'));
        expect(onExpand).toHaveBeenCalledTimes(1);
    });
});
