// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import {Client4} from '@mm-redux/client';

import FileAttachmentImage from './file_attachment_image.js';

describe('FileAttachmentImage', () => {
    const baseProps = {
        file: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <FileAttachmentImage {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    describe('imageProps', () => {
        const wrapper = shallow(
            <FileAttachmentImage {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should have file.localPath as defaultSource if localPath is set', () => {
            wrapper.setState({failed: false});
            const file = {localPath: '/localPath.png'};
            const imageProps = instance.imageProps(file);
            expect(imageProps.defaultSource).toStrictEqual({uri: file.localPath});
            expect(imageProps.thumbnailUri).toBeUndefined();
            expect(imageProps.imageUri).toBeUndefined();
        });

        it('should have thumbnailUri and imageUri if the file has an ID', () => {
            const getFileThumbnailUrl = jest.spyOn(Client4, 'getFileThumbnailUrl');
            const getFilePreviewUrl = jest.spyOn(Client4, 'getFilePreviewUrl');

            wrapper.setState({failed: false});
            const file = {id: 'id'};
            const imageProps = instance.imageProps(file);
            expect(getFileThumbnailUrl).toHaveBeenCalled();
            expect(getFilePreviewUrl).toHaveBeenCalled();
            expect(imageProps.defaultSource).toBeUndefined();
            expect(imageProps.thumbnailUri).toBeDefined();
            expect(imageProps.imageUri).toBeDefined();
        });
    });
});
