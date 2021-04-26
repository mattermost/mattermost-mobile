// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import FastImage from 'react-native-fast-image';

import RetriableFastImage, {FAST_IMAGE_MAX_RETRIES} from './index';
import CompassIcon from '@components/compass_icon';

describe('RetriableFastImage', () => {
    const httpUri = 'http://placekitten.com/400/400';
    const fileUri = 'file://path/to/file';
    const contentUri = 'content://com.example.mattermost/path/to/file';
    const dataUri = 'data:image/jpeg;base64,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';
    const invalidUri = 'INVALID_URI';

    const baseProps = {
        id: 'id',
        onError: jest.fn(),
    };

    it('should render a image for a valid HTTP URL', () => {
        const props = {
            ...baseProps,
            source: {
                uri: httpUri,
            },
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-0`}/>)).toBeTruthy();
    });

    it('should render a image for a valid Data URL', () => {
        const props = {
            ...baseProps,
            source: {
                uri: dataUri,
            },
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-0`}/>)).toBeTruthy();
    });

    it('should render a image for a valid Content URL', () => {
        const props = {
            ...baseProps,
            source: {
                uri: contentUri,
            },
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-0`}/>)).toBeTruthy();
    });

    it('should render a image for a valid File URL', () => {
        const props = {
            ...baseProps,
            source: {
                uri: fileUri,
            },
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-0`}/>)).toBeTruthy();
    });

    it('should render null on invalid uri', () => {
        const props = {
            ...baseProps,
            source: {
                uri: invalidUri,
            },
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-0`}/>)).toBeFalsy();
    });

    it('should render image on invalid uri with error prop', () => {
        const props = {
            ...baseProps,
            source: {
                uri: invalidUri,
            },
            renderOnError: true,
        };
        const wrapper = shallow(<RetriableFastImage {...props}/>);

        expect(wrapper.containsMatchingElement(<CompassIcon/>)).toBeTruthy();
    });

    it('should update the FastImage element test-id on error until max retries has been reached', () => {
        const props = {
            ...baseProps,
            source: {
                uri: dataUri,
            },
            renderOnError: true,
        };
        const wrapper = shallow(
            <RetriableFastImage {...props}/>,
        );
        const instance = wrapper.instance();

        let retry = 0;
        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-${retry}`}/>)).toEqual(true);
        while (instance.state.retry < FAST_IMAGE_MAX_RETRIES) {
            instance.onError();
            retry += 1;
            expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-${retry}`}/>)).toEqual(true);
        }

        instance.onError();
        expect(wrapper.containsMatchingElement(<FastImage key={`${baseProps.id}-${retry}`}/>)).toEqual(true);
    });

    it('should call props.onError only after max retries has been reached', () => {
        const wrapper = shallow(
            <RetriableFastImage {...baseProps}/>,
        );
        const instance = wrapper.instance();

        let retry = 0;
        while (instance.state.retry < FAST_IMAGE_MAX_RETRIES) {
            instance.onError();
            retry += 1;
            expect(instance.state.retry).toEqual(retry);
            expect(baseProps.onError).not.toHaveBeenCalled();
        }

        instance.onError();
        expect(instance.state.retry).toEqual(retry);
        expect(baseProps.onError).toHaveBeenCalled();
    });
});
