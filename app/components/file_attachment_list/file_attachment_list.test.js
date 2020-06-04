// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import FileAttachment from './file_attachment_list.js';
import Preferences from '@mm-redux/constants/preferences';

jest.mock('react-native-file-viewer', () => ({
    open: jest.fn(),
}));

describe('FileAttachmentList', () => {
    const files = [{
        create_at: 1546893090093,
        delete_at: 0,
        extension: 'png',
        has_preview_image: true,
        height: 171,
        id: 'fileId',
        mime_type: 'image/png',
        name: 'image01.png',
        post_id: 'postId',
        size: 14894,
        update_at: 1546893090093,
        user_id: 'userId',
        width: 425,
    },
    {
        create_at: 1546893090093,
        delete_at: 0,
        extension: 'png',
        has_preview_image: true,
        height: 800,
        id: 'otherFileId',
        mime_type: 'image/png',
        name: 'image02.png',
        post_id: 'postId',
        size: 24894,
        update_at: 1546893090093,
        user_id: 'userId',
        width: 555,
    }];

    const nonImage = {
        extension: 'other',
        id: 'fileId',
        mime_type: 'other/type',
        name: 'file01.other',
        post_id: 'postId',
        size: 14894,
        user_id: 'userId',
    };

    const baseProps = {
        canDownloadFiles: true,
        deviceHeight: 680,
        deviceWidth: 660,
        fileIds: ['fileId'],
        files: [files[0]],
        postId: 'postId',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot with a single image file', () => {
        const wrapper = shallow(
            <FileAttachment {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with two image files', () => {
        const props = {
            ...baseProps,
            files,
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with three image files', () => {
        const thirdImage = {...files[1], id: 'thirdFileId', name: 'image03.png'};
        const props = {
            ...baseProps,
            files: [...files, thirdImage],
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with four image files', () => {
        const thirdImage = {...files[1], id: 'thirdFileId', name: 'image03.png'};
        const fourthImage = {...files[1], id: 'fourthFileId', name: 'image04.png'};

        const props = {
            ...baseProps,
            files: [...files, thirdImage, fourthImage],
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with more than four image files', () => {
        const thirdImage = {...files[1], id: 'thirdFileId', name: 'image03.png'};
        const fourthImage = {...files[1], id: 'fourthFileId', name: 'image04.png'};
        const fifthImage = {...files[1], id: 'fifthFileId', name: 'image05.png'};
        const sixthImage = {...files[1], id: 'sixthFileId', name: 'image06.png'};

        const props = {
            ...baseProps,
            files: [...files, thirdImage, fourthImage, fifthImage, sixthImage],
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with non-image attachment', () => {
        const props = {
            ...baseProps,
            files: [nonImage],
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with combination of image and non-image attachments', () => {
        const props = {
            ...baseProps,
            files: [...files, nonImage],
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call getFilesForGallery on props change', async () => {
        const props = {
            ...baseProps,
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>,
        );

        wrapper.instance().getFilesForGallery = jest.fn().mockImplementationOnce(() => []);
        wrapper.setProps({files: [files[0], files[1]]});
        expect(wrapper.instance().getFilesForGallery).toHaveBeenCalled();
    });
});
