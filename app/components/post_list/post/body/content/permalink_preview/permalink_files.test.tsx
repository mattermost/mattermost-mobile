// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter, View} from 'react-native';

import Files from '@components/files';
import {Events} from '@constants';
import EphemeralStore from '@store/ephemeral_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkFiles from './permalink_files';

jest.mock('@components/files', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Files).mockImplementation(() =>
    React.createElement(View, {testID: 'files'}, null),
);

describe('PermalinkFiles viewport relay', () => {
    const post = TestHelper.fakePostModel({id: 'linked-post-id'});
    const location = 'permalink_preview';
    const parentLocation = 'Channel';
    const parentPostId = 'host-post-id';
    const parentKey = `${parentLocation}-${parentPostId}`;
    const expectedRelay = {[`${location}-${post.id}`]: true};

    const renderComponent = (props: Partial<React.ComponentProps<typeof PermalinkFiles>> = {}) => {
        return renderWithIntlAndTheme(
            <PermalinkFiles
                post={post}
                location={location}
                isReplyPost={false}
                parentLocation={parentLocation}
                parentPostId={parentPostId}
                {...props}
            />,
        );
    };

    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
        emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        EphemeralStore.clearViewableItems();
    });

    it('should relay the viewport event on mount when the parent post is already in the viewport', () => {
        EphemeralStore.setViewableItems(parentLocation, {[parentKey]: true});

        renderComponent();

        expect(emitSpy).toHaveBeenCalledWith(Events.ITEM_IN_VIEWPORT, expectedRelay);
    });

    it('should not relay on mount when the parent post is not in the viewport', () => {
        EphemeralStore.setViewableItems(parentLocation, {'Channel-a-different-post': true});

        renderComponent();

        expect(emitSpy).not.toHaveBeenCalledWith(Events.ITEM_IN_VIEWPORT, expectedRelay);
    });

    it('should not relay on mount when there is no parent post to track', () => {
        EphemeralStore.setViewableItems(parentLocation, {[parentKey]: true});

        renderComponent({parentLocation: undefined, parentPostId: undefined});

        expect(emitSpy).not.toHaveBeenCalledWith(Events.ITEM_IN_VIEWPORT, expectedRelay);
    });

    it('should relay a viewport event received after mount', () => {
        renderComponent();
        expect(emitSpy).not.toHaveBeenCalledWith(Events.ITEM_IN_VIEWPORT, expectedRelay);

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {[parentKey]: true});
        });

        expect(emitSpy).toHaveBeenCalledWith(Events.ITEM_IN_VIEWPORT, expectedRelay);
    });
});
