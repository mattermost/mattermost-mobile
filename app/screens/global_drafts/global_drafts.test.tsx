import {Database, Model} from '@nozbe/watermelondb';
import {act, fireEvent} from '@testing-library/react-native';

import {renderWithEverything} from '@test/intl-test-helper';
import {setupServerDatabase} from '@test/server-test-helper';

import GlobalDraftsAndScheduledPosts from './index';

describe('screens/global_drafts', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot', () => {
        const {toJSON} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database}
        );
        expect(toJSON()).toMatchSnapshot();
    });

    it('should render drafts list when scheduled posts is disabled', () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database}
        );

        expect(getByTestId('global_drafts.screen')).toBeTruthy();
        expect(queryByTestId('draft_tab_container')).toBeFalsy();
    });

    it('should render tabs when scheduled posts is enabled', async () => {
        await database.write(async () => {
            await database.get('Config').create((c: Model) => {
                c._raw.value = 'true';
                c._raw.name = 'ScheduledPosts';
            });
        });

        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database}
        );

        expect(getByTestId('draft_tab_container')).toBeTruthy();
        expect(getByTestId('draft_tab')).toBeTruthy();
        expect(getByTestId('scheduled_post_tab')).toBeTruthy();
    });

    it('should switch between tabs', async () => {
        await database.write(async () => {
            await database.get('Config').create((c: Model) => {
                c._raw.value = 'true';
                c._raw.name = 'ScheduledPosts';
            });
        });

        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database}
        );

        const draftTab = getByTestId('draft_tab');
        const scheduledTab = getByTestId('scheduled_post_tab');

        // Initially drafts list should be visible
        expect(getByTestId('draft_list_container')).toBeTruthy();

        // Switch to scheduled posts
        act(() => {
            fireEvent.press(scheduledTab);
        });

        // Scheduled posts list should now be visible
        expect(getByTestId('scheduled_posts_list_container')).toBeTruthy();

        // Switch back to drafts
        act(() => {
            fireEvent.press(draftTab);
        });

        // Drafts list should be visible again
        expect(getByTestId('draft_list_container')).toBeTruthy();
    });
});
