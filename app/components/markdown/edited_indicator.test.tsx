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

// Locks in the element tree the renderer produces for an edited post: the marker is a
// sibling subtree of the message, and an @mention splits the message itself.
//
// This is the REACT element tree only. On device React Native collapses nested <Text>
// into a single native view whose text is the concatenation, which is why the Detox
// helper ChannelScreen.assertPostMessageEdited can and does match
// `${message}.*Edited` against one node. Asserting the marker separately by its
// edited_indicator testID was tried on run 32214085246 and regressed MM-T851,
// MM-T4783_1, MM-T4783_3, MM-T4786_1, MM-T4910_3, MM-T5294_10 and MM-T4918_3 on
// Android — nested <Text> testIDs are not separately matchable there. Do not use this
// file to reason about what Detox can match; it only describes the JS side.
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
