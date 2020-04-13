// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as SystemMessageHelpers from './system_message_helpers';
import {Posts} from 'mattermost-redux/constants';

const basePostBodyProps = {
    postProps: {
        username: 'username',
    },
    onPress: jest.fn(),
};

const mockStyles = {
    messageStyle: {},
    textStyles: {},
};

const mockIntl = {
    formatMessage: ({defaultMessage}) => defaultMessage,
};

describe('renderSystemMessage', () => {
    test('uses renderer for Channel Header update', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {
                ...basePostBodyProps.postProps,
                old_header: 'old header',
                new_header: 'new header',
            },
            postType: Posts.POST_TYPES.HEADER_CHANGE,
        };
        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('uses renderer for Channel Display Name update', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {
                ...basePostBodyProps.postProps,
                old_displayname: 'old displayname',
                new_displayname: 'new displayname',
            },
            postType: Posts.POST_TYPES.DISPLAYNAME_CHANGE,
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('uses renderer for Channel Purpose update', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {
                ...basePostBodyProps.postProps,
                old_purpose: 'old purpose',
                new_purpose: 'new purpose',
            },
            postType: Posts.POST_TYPES.PURPOSE_CHANGE,
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('uses renderer for archived channel', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {
                ...basePostBodyProps.postProps,
            },
            postType: Posts.POST_TYPES.CHANNEL_DELETED,
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('uses renderer for OLD archived channel without a username', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {},
            postType: Posts.POST_TYPES.CHANNEL_DELETED,
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('uses renderer for unarchived channel', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {
                ...basePostBodyProps.postProps,
            },
            postType: Posts.POST_TYPES.CHANNEL_UNARCHIVED,
        };

        let renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();

        const noUserInPostBodyProps = {
            ...basePostBodyProps,
            postProps: {},
            postType: Posts.POST_TYPES.CHANNEL_UNARCHIVED,
        };

        renderedMessage = SystemMessageHelpers.renderSystemMessage(noUserInPostBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toMatchSnapshot();
    });

    test('is null for non-qualifying system messages', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postType: 'not_relevant',
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        expect(renderedMessage).toBeNull();
    });
});
