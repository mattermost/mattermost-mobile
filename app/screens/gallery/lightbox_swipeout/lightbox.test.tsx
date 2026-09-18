// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import {useLightboxSharedValues} from './context';
import Lightbox from './lightbox';

import type {GalleryItemType, GalleryManagerSharedValues} from '@typings/screens/gallery';

type MockExpoImageAnimatedProps = React.ComponentProps<(typeof import('@components/expo_image'))['ExpoImageAnimated']>;
type MockViewProps = React.ComponentProps<(typeof import('react-native'))['View']>;

jest.mock('@components/expo_image', () => {
    const ReactModule: typeof import('react') = require('react');
    const {View: MockView}: typeof import('react-native') = require('react-native');

    return {
        ExpoImageAnimated: jest.fn((props: MockExpoImageAnimatedProps) => ReactModule.createElement(MockView, {
            ...props,
            testID: 'lightbox.transition.image',
        } as MockViewProps)),
    };
});

jest.mock('@hooks/did_mount', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./context', () => ({
    useLightboxSharedValues: jest.fn(),
}));

const sharedValue = <T, >(value: T) => ({value});

describe('Lightbox', () => {
    it('should render the transition image without a separately cached placeholder', () => {
        const image = {
            cacheKey: 'file-1',
            height: 200,
            type: 'image',
            width: 300,
        } as GalleryItemType;
        const sharedValues = {
            height: sharedValue(100),
            width: sharedValue(150),
            x: sharedValue(10),
            y: sharedValue(20),
        } as GalleryManagerSharedValues;

        jest.mocked(useLightboxSharedValues).mockReturnValue({
            animationProgress: sharedValue(0),
            childTranslateY: sharedValue(0),
            childrenOpacity: sharedValue(0),
            headerAndFooterHidden: sharedValue(false),
            imageOpacity: sharedValue(1),
            opacity: sharedValue(1),
            scale: sharedValue(1),
            target: image,
            targetDimensions: {height: 800, width: 400},
            translateX: sharedValue(0),
            translateY: sharedValue(0),
        } as ReturnType<typeof useLightboxSharedValues>);

        const {getByTestId} = render(
            <Lightbox
                renderItem={jest.fn()}
                sharedValues={sharedValues}
                source='https://example.com/image.png'
            >
                {null}
            </Lightbox>,
        );

        const transitionImage = getByTestId('lightbox.transition.image');
        expect(transitionImage).toHaveProp('source', {uri: 'https://example.com/image.png'});
        expect(transitionImage).not.toHaveProp('placeholder');
    });
});
