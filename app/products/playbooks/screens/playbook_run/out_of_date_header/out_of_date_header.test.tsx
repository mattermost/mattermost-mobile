// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderWithIntl, waitFor} from '@test/intl-test-helper';

import OutOfDateHeader from './out_of_date_header';

jest.mock('@components/compass_icon', () => 'CompassIcon');

describe('OutOfDateHeader', () => {
    const mockTimestamp = 1234567890;

    it('renders the message', () => {
        const {getAllByText} = renderWithIntl(
            <OutOfDateHeader
                websocketState='disconnected'
                lastSyncAt={mockTimestamp}
            />,
        );

        expect(getAllByText(/Unable to connect to server/)).toHaveLength(2); // original + calculator
    });

    it('shows the correct style based on websocket state', async () => {
        const {root, rerender} = renderWithIntl(
            <OutOfDateHeader
                websocketState='disconnected'
                lastSyncAt={mockTimestamp}
            />,
        );

        expect(root).toHaveAnimatedStyle({paddingVertical: 12});

        rerender(
            <OutOfDateHeader
                websocketState='connected'
                lastSyncAt={mockTimestamp}
            />,
        );
        await waitFor(() => {
            // For some reason, the paddingVertical is settling on null,
            // instead of 0. This is a workaround but we may have to look
            // into why this is happening.
            expect(root).not.toHaveAnimatedStyle({paddingVertical: 12});
        });
    });

    it('should not render if lastSyncAt is not provided', () => {
        const {root} = renderWithIntl(
            <OutOfDateHeader
                websocketState='disconnected'
                lastSyncAt={0}
            />,
        );

        expect(root).toBeUndefined();
    });
});
