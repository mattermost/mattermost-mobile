// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ExternalImage from './external_image';

jest.mock('@context/server', () => ({
    ...jest.requireActual('@context/server'),
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        getClient: () => ({
            getBaseRoute: () => 'https://server.example.com/api/v4',
        }),
    },
}));

describe('ExternalImage', () => {
    const baseProps = {
        children: jest.fn((src: string) => <>{src}</>),
        enableSVGs: true,
        hasImageProxy: false,
        imageMetadata: {
            format: 'png',
            height: 300,
            width: 200,
        },
        src: 'https://example.com/image.png',
    };

    beforeEach(() => {
        jest.mocked(baseProps.children).mockClear();
    });

    it('should pass through src when proxy is disabled', () => {
        renderWithIntl(
            <ExternalImage {...baseProps}/>,
        );

        expect(baseProps.children).toHaveBeenCalledWith(baseProps.src);
    });

    it('should pass empty src for svg when svgs are disabled', () => {
        renderWithIntl(
            <ExternalImage
                {...baseProps}
                enableSVGs={false}
                imageMetadata={{format: 'svg', height: 0, width: 0}}
                src='https://example.com/logo.svg'
            />,
        );

        expect(baseProps.children).toHaveBeenCalledWith('');
    });

    it('should proxy src when image proxy is enabled', () => {
        renderWithIntl(
            <ExternalImage
                {...baseProps}
                hasImageProxy={true}
            />,
        );

        expect(baseProps.children).toHaveBeenCalledWith(
            'https://server.example.com/api/v4/image?url=' + encodeURIComponent(baseProps.src),
        );
    });
});
