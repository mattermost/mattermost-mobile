// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from '@mm-redux/constants';
import {renderWithRedux} from 'test/testing_library';

import * as SystemMessageHelpers from './system_message_helpers';

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
        const {getByText, toJSON} = renderWithRedux(renderedMessage);
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('{username} updated the channel header from: {oldHeader} to: {newHeader}')).toBeTruthy();
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
        const {getByText, toJSON} = renderWithRedux(renderedMessage);
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('{username} updated the channel display name from: {oldDisplayName} to: {newDisplayName}')).toBeTruthy();
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
        const {getByText, toJSON} = renderWithRedux(renderedMessage);
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('{username} updated the channel purpose from: {oldPurpose} to: {newPurpose}')).toBeTruthy();
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
        const {getByText, toJSON} = renderWithRedux(renderedMessage);
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('{username} archived the channel')).toBeTruthy();
    });

    test('uses renderer for OLD archived channel without a username', () => {
        const postBodyProps = {
            ...basePostBodyProps,
            postProps: {},
            postType: Posts.POST_TYPES.CHANNEL_DELETED,
        };

        const renderedMessage = SystemMessageHelpers.renderSystemMessage(postBodyProps, mockStyles, mockIntl);
        const {getByText, toJSON} = renderWithRedux(renderedMessage);
        expect(toJSON()).toMatchSnapshot();
        expect(getByText('{username} archived the channel')).toBeTruthy();
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
        const viewOne = renderWithRedux(renderedMessage);
        expect(viewOne.toJSON()).toMatchSnapshot();
        expect(viewOne.getByText('{username} unarchived the channel')).toBeTruthy();

        const noUserInPostBodyProps = {
            ...basePostBodyProps,
            postProps: {},
            postType: Posts.POST_TYPES.CHANNEL_UNARCHIVED,
        };

        renderedMessage = SystemMessageHelpers.renderSystemMessage(noUserInPostBodyProps, mockStyles, mockIntl);
        const viewTwo = renderWithRedux(renderedMessage);
        expect(viewTwo.toJSON()).toBeNull();
        expect(viewTwo.queryByText('{username} archived the channel')).toBeFalsy();
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
