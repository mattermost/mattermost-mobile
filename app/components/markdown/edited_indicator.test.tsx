// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Markdown from './markdown';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    navigateToRoot: jest.fn(),
}));

// The E2E helper ChannelScreen.assertPostMessageEdited used to require the message and
// the "Edited" marker to land in one matchable text node. These lock in the shape the
// renderer actually produces, so that assumption cannot silently come back.
describe('Markdown edited indicator layout', () => {
    const serverUrl = 'markdown.edited.test.com';
    let database: Database;

    const baseProps: React.ComponentProps<typeof Markdown> = {
        baseTextStyle: {},
        enableInlineLatex: true,
        enableLatex: true,
        location: Screens.CHANNEL,
        maxNodes: 2000,
        theme: Preferences.THEMES.denim,
    };

    beforeEach(async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        database = DatabaseManager.serverDatabases[serverUrl]!.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const textNodes = () => screen.UNSAFE_root.
        findAllByType('Text' as never, {deep: true}).
        map((node: any) => ({
            testID: node.props.testID,
            text: [node.props.children].flat(Infinity).filter((c: unknown) => typeof c === 'string').join(''),
        }));

    it('renders the marker outside the message node, not appended to it', () => {
        renderWithEverything(
            <Markdown
                {...baseProps}
                value='Own mention abc edit'
                isEdited={true}
            />,
            {database, serverUrl},
        );

        const nodes = textNodes();

        // The whole message is one markdown_text node...
        expect(nodes.some((n) => n.testID === 'markdown_text' && n.text === 'Own mention abc edit')).toBe(true);

        // ...and no node carries the message with "Edited" appended to it.
        expect(nodes.some((n) => n.text.includes('Own mention abc edit') && n.text.includes('Edited'))).toBe(false);

        // The marker is its own subtree: spacer, then the icon glyph, then the label.
        expect(nodes.some((n) => n.testID === 'edited_indicator')).toBe(true);
        expect(nodes.some((n) => n.text === 'Edited')).toBe(true);
    });

    it('splits the message itself around an @mention', () => {
        renderWithEverything(
            <Markdown
                {...baseProps}
                location={Screens.MENTIONS}
                value='Own mention abc @user1 edit'
                isEdited={true}
                mentionKeys={[{key: '@user1'}]}
            />,
            {database, serverUrl},
        );

        const nodes = textNodes();

        // Recent Mentions rows always carry an @mention, and it breaks the body into
        // separate children — there is no single node holding the full message.
        expect(nodes.some((n) => n.text === 'Own mention abc @user1 edit')).toBe(false);
        expect(nodes.some((n) => n.testID === 'markdown_text' && n.text === 'Own mention abc ')).toBe(true);
        expect(nodes.some((n) => n.text === '@user1')).toBe(true);
        expect(nodes.some((n) => n.testID === 'markdown_text' && n.text === ' edit')).toBe(true);
        expect(nodes.some((n) => n.testID === 'edited_indicator')).toBe(true);
    });
});
