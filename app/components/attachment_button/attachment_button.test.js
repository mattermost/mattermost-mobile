// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {VALID_MIME_TYPES} from 'app/screens/edit_profile/edit_profile';
import AttachmentButton from './attachment_button';

jest.mock('react-intl');

describe('AttachmentButton', () => {
    const baseProps = {
        actions: {
            showModalOverCurrentContext: jest.fn(),
        },
        theme: Preferences.THEMES.default,
        blurTextBox: jest.fn(),
        maxFileSize: 10,
        uploadFiles: jest.fn(),
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AttachmentButton {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not upload file with invalid MIME type', () => {
        const props = {
            ...baseProps,
            validMimeTypes: VALID_MIME_TYPES,
            onShowUnsupportedMimeTypeWarning: jest.fn(),
        };

        const wrapper = shallow(
            <AttachmentButton {...props}/>
        );

        const file = {
            type: 'image/gif',
            fileSize: 10,
            fileName: 'test',
        };
        wrapper.instance().uploadFiles([file]);
        expect(props.onShowUnsupportedMimeTypeWarning).toHaveBeenCalled();
        expect(props.uploadFiles).not.toHaveBeenCalled();
    });

    test('should upload file with valid MIME type', () => {
        const props = {
            ...baseProps,
            validMimeTypes: VALID_MIME_TYPES,
            onShowUnsupportedMimeTypeWarning: jest.fn(),
        };

        const wrapper = shallow(
            <AttachmentButton {...props}/>
        );

        const file = {
            fileSize: 10,
            fileName: 'test',
        };
        VALID_MIME_TYPES.forEach((mimeType) => {
            file.type = mimeType;
            wrapper.instance().uploadFiles([file]);
            expect(props.onShowUnsupportedMimeTypeWarning).not.toHaveBeenCalled();
            expect(props.uploadFiles).toHaveBeenCalled();
        });
    });
});
