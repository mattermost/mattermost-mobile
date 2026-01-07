// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import BORReadReceipts from './index';

import type {Database} from '@nozbe/watermelondb';

describe('BORReadReceipts', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render title and read receipt text with correct values', () => {
        renderWithEverything(
            <BORReadReceipts
                totalReceipts={5}
                readReceipts={3}
            />,
            {database},
        );

        expect(screen.getByText('Burn-on-read message')).toBeVisible();
        expect(screen.getByText('Read by 3 of 5 recipients')).toBeVisible();
    });

    it('should render with zero read receipts', () => {
        renderWithEverything(
            <BORReadReceipts
                totalReceipts={10}
                readReceipts={0}
            />,
            {database},
        );

        expect(screen.getByText('Burn-on-read message')).toBeVisible();
        expect(screen.getByText('Read by 0 of 10 recipients')).toBeVisible();
    });

    it('should render when all recipients have read', () => {
        renderWithEverything(
            <BORReadReceipts
                totalReceipts={7}
                readReceipts={7}
            />,
            {database},
        );

        expect(screen.getByText('Burn-on-read message')).toBeVisible();
        expect(screen.getByText('Read by 7 of 7 recipients')).toBeVisible();
    });

    it('should render with single recipient', () => {
        renderWithEverything(
            <BORReadReceipts
                totalReceipts={1}
                readReceipts={1}
            />,
            {database},
        );

        expect(screen.getByText('Burn-on-read message')).toBeVisible();
        expect(screen.getByText('Read by 1 of 1 recipients')).toBeVisible();
    });
});
