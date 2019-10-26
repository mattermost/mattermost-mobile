// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import FileAttachment from './file_attachment_list.js';
import Preferences from 'mattermost-redux/constants/preferences';

jest.mock('react-native-doc-viewer', () => ({
    openDoc: jest.fn(),
}));

describe('PostAttachmentOpenGraph', () => {
    const loadFilesForPostIfNecessary = jest.fn().mockImplementationOnce(() => Promise.resolve({data: {}}));

    const baseProps = {
        actions: {
            loadFilesForPostIfNecessary,
        },
        canDownloadFiles: true,
        deviceHeight: 680,
        deviceWidth: 660,
        fileIds: ['fileId'],
        files: [{
            create_at: 1546893090093,
            delete_at: 0,
            extension: 'png',
            has_preview_image: true,
            height: 171,
            id: 'fileId',
            mime_type: 'image/png',
            name: 'image.png',
            post_id: 'postId',
            size: 14894,
            update_at: 1546893090093,
            user_id: 'userId',
            width: 425,
        }],
        postId: 'postId',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot with a single image file', () => {
        const wrapper = shallow(
            <FileAttachment {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call loadFilesForPostIfNecessary when files does not exist', async () => {
        const props = {
            ...baseProps,
            files: undefined,
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>
        );
        expect(wrapper.state('loadingFiles')).toBe(true);
        expect(props.actions.loadFilesForPostIfNecessary).toHaveBeenCalledWith(props.postId);
        await loadFilesForPostIfNecessary();
        wrapper.setProps({files: baseProps.files});
        expect(wrapper.state('loadingFiles')).toBe(false);
    });

    test('should call loadFilesForPostIfNecessary on componentUpdate and when files does not exist', async () => {
        const loadFilesForPostIfNecessaryMock = jest.fn().mockImplementationOnce(() => Promise.resolve({data: {}}));
        const props = {
            ...baseProps,
            files: [],
            actions: {
                loadFilesForPostIfNecessary: loadFilesForPostIfNecessaryMock,
            },
        };

        const wrapper = shallow(
            <FileAttachment {...props}/>
        );
        expect(wrapper.state('loadingFiles')).toBe(true);
        expect(props.actions.loadFilesForPostIfNecessary).toHaveBeenCalledTimes(1);
        expect(props.actions.loadFilesForPostIfNecessary).toHaveBeenCalledWith(props.postId);
        await loadFilesForPostIfNecessaryMock();
        expect(props.actions.loadFilesForPostIfNecessary).toHaveBeenCalledTimes(2);
        expect(props.actions.loadFilesForPostIfNecessary).toHaveBeenCalledWith(props.postId);
        await loadFilesForPostIfNecessaryMock();
        wrapper.setProps({files: baseProps.files});
        expect(wrapper.state('loadingFiles')).toBe(false);
    });
});
