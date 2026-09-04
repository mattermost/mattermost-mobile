// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences, Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers} from '@test/timer_helpers';

import MarkdownCodeBlock from '.';

import type {SyntaxHiglightProps} from '@typings/components/syntax_highlight';

const mockSyntaxHighlighter = jest.fn();

jest.mock('@components/syntax_highlight', () => ({
    __esModule: true,
    default: (props: SyntaxHiglightProps) => {
        mockSyntaxHighlighter(props);
        return null;
    },
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
    navigateToScreen: jest.fn(),
}));

describe('MarkdownCodeBlock', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should reuse the preview highlighting language in the fullscreen viewer', async () => {
        const previewCode = [
            'groupConstrainedChannel := &model.Channel{',
            '    DisplayName: "Test API Name",',
            '    Name: GenerateTestChannelName(),',
            '    Type: model.ChannelTypeOpen,',
        ].join('\n');
        const content = [
            previewCode,
            '    TeamId: team.Id,',
            '    GroupConstrained: model.NewBool(true),',
            '}',
        ].join('\n');
        const textStyle = {};
        const {getByTestId} = renderWithIntlAndTheme(
            <MarkdownCodeBlock
                content={content}
                language='golang'
                textStyle={textStyle}
                theme={Preferences.THEMES.denim}
            />,
        );

        expect(mockSyntaxHighlighter).toHaveBeenCalledWith(expect.objectContaining({
            code: previewCode,
            language: 'dts',
        }));

        await act(async () => {
            fireEvent.press(getByTestId('markdown_code_block'));
            await advanceTimers(20);
        });

        expect(navigateToScreen).toHaveBeenCalledWith(Screens.CODE, expect.objectContaining({
            code: content,
            language: 'dts',
            textStyle,
        }));
    });
});
