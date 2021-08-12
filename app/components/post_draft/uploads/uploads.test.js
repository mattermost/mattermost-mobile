// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import Uploads from './uploads';

describe('Uploads', () => {
    const baseProps = {
        canUploadFiles: true,
        channelId: 'channel-id',
        files: [],
        filesUploadingForCurrentChannel: true,
        handleRemoveLastFile: jest.fn(),
        initUploadFiles: jest.fn(),
        maxFileSize: 100,
        screenId: 'Channel',
        theme: Preferences.THEMES.default,
    };

    test('handleUploadFiles should return early if screen is not the top screen', async () => {
        const topScreenId = 'top-screen';

        const props = {
            ...baseProps,
            screenId: `not-${topScreenId}`,
        };
        const wrapper = shallow(
            <Uploads {...props}/>,
        );
        const instance = wrapper.instance();
        instance.handleFileSizeWarning = jest.fn();

        await instance.handleUploadFiles([]);
        expect(instance.handleFileSizeWarning).not.toHaveBeenCalled();
        expect(props.initUploadFiles).not.toHaveBeenCalled();
    });

    test('handlePasteFiles should display an error if uploads are disabled', () => {
        const topScreenId = 'top-screen';

        const props = {
            ...baseProps,
            canUploadFiles: false,
            screenId: topScreenId,
        };
        const wrapper = shallow(
            <Uploads {...props}/>,
        );
        const instance = wrapper.instance();
        instance.showPasteFilesErrorDialog = jest.fn();
        instance.handleUploadDisabled = jest.fn();

        instance.handlePasteFiles(undefined, [], topScreenId);
        expect(instance.showPasteFilesErrorDialog).not.toHaveBeenCalled();
        expect(instance.handleUploadDisabled).toHaveBeenCalled();
    });
});
