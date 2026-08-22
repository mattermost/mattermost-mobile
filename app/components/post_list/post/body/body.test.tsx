// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Screens} from '@constants';
import Preferences from '@constants/preferences';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Body from './body';
import Message from './message';

jest.mock('./message', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Message).mockImplementation(() =>
    React.createElement(View, {testID: 'message'}, null),
);

describe('Body redacted files placeholder', () => {
    const theme = Preferences.THEMES.denim;

    const renderBody = (metadata: PostMetadata) => {
        const post = TestHelper.fakePostModel({
            id: 'post-id',
            message: 'a message',
            metadata,
        });

        return renderWithIntlAndTheme(
            <Body
                appsEnabled={false}
                mmBlocksEnabled={false}
                filesInfo={[]}
                hasReactions={false}
                highlight={false}
                highlightReplyBar={false}
                isEphemeral={false}
                isJumboEmoji={false}
                isPendingOrFailed={false}
                isPostAddChannelMember={false}
                location={Screens.CHANNEL}
                post={post}
                theme={theme}
                isChannelAutotranslated={false}
            />,
        );
    };

    it('should render the placeholder when the post has redacted files', () => {
        const {getByTestId} = renderBody({redacted_file_count: 2} as PostMetadata);

        expect(getByTestId('redacted-files-placeholder')).toBeTruthy();
    });

    it('should not render the placeholder when no files are redacted', () => {
        const {queryByTestId} = renderBody({redacted_file_count: 0} as PostMetadata);

        expect(queryByTestId('redacted-files-placeholder')).toBeNull();
    });

    it('should not render the placeholder when the server sent no redacted count', () => {
        const {queryByTestId} = renderBody({} as PostMetadata);

        expect(queryByTestId('redacted-files-placeholder')).toBeNull();
    });
});
