// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import FileAttachment from './file_attachment.js';
import Preferences from '@mm-redux/constants/preferences';

jest.mock('react-native-file-viewer', () => ({
    open: jest.fn(),
}));

describe('FileAttachment', () => {
    const baseProps = {
        canDownloadFiles: true,
        file: {
            create_at: 1546893090093,
            delete_at: 0,
            extension: 'png',
            has_preview_image: true,
            height: 171,
            id: 'fileId',
            name: 'image.png',
            post_id: 'postId',
            size: 14894,
            update_at: 1546893090093,
            user_id: 'userId',
            width: 425,
            data: {
                mime_type: 'image/png',
            },
        },
        id: 'id',
        index: 0,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <FileAttachment {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
