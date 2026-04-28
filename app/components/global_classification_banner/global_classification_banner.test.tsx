// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {CLASSIFICATION_BANNER_HEIGHT} from '@constants/view';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import GlobalClassificationBanner from './global_classification_banner';

const baseProps = {
    visible: true,
    levelName: 'TOP SECRET',
    color: '#FCE83A',
};

describe('GlobalClassificationBanner', () => {
    it('should render with valid props', () => {
        renderWithIntlAndTheme(<GlobalClassificationBanner {...baseProps}/>);

        expect(screen.getByTestId('global_classification_banner')).toBeVisible();
        expect(screen.getByText('TOP SECRET')).toBeVisible();
    });

    it('should not render when visible is false', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                visible={false}
            />,
        );

        expect(screen.queryByTestId('global_classification_banner')).toBeNull();
    });

    it('should not render when level name is empty', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                levelName=''
            />,
        );

        expect(screen.queryByTestId('global_classification_banner')).toBeNull();
    });

    it('should display the level name text', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                levelName='TOP SECRET//SCI'
            />,
        );

        expect(screen.getByText('TOP SECRET//SCI')).toBeVisible();
    });

    it('should have the correct height', () => {
        renderWithIntlAndTheme(<GlobalClassificationBanner {...baseProps}/>);

        const banner = screen.getByTestId('global_classification_banner');
        expect(banner).toHaveStyle({height: CLASSIFICATION_BANNER_HEIGHT});
    });

    it('should apply the background color', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                color='#FF0000'
            />,
        );

        const banner = screen.getByTestId('global_classification_banner');
        expect(banner).toHaveStyle({backgroundColor: '#FF0000'});
    });

    it('should use black text on a light background color', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                color='#FCE83A'
            />,
        );

        const text = screen.getByText('TOP SECRET');
        expect(text).toHaveStyle({color: '#000000'});
    });

    it('should use white text on a dark background color', () => {
        renderWithIntlAndTheme(
            <GlobalClassificationBanner
                {...baseProps}
                color='#000000'
            />,
        );

        const text = screen.getByText('TOP SECRET');
        expect(text).toHaveStyle({color: '#FFFFFF'});
    });

    it('should apply uppercase text transform to the level name', () => {
        renderWithIntlAndTheme(<GlobalClassificationBanner {...baseProps}/>);

        const text = screen.getByText('TOP SECRET');
        expect(text).toHaveStyle({textTransform: 'uppercase'});
    });
});
