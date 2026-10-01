// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ServerToolName, ServerToolStatus, type ServerToolUse} from '@agents/types';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ServerToolCard from './server_tool_card';

describe('ServerToolCard', () => {
    it('should describe a web search by its query without offering details', () => {
        const tool: ServerToolUse = {id: 's1', tool: ServerToolName.WebSearch, status: ServerToolStatus.InProgress, query: 'mattermost'};

        const {getByText, getByTestId} = renderWithIntlAndTheme(<ServerToolCard tool={tool}/>);

        expect(getByText('Searched the web for "mattermost"')).toBeTruthy();
        expect(getByTestId('agents.server_tool.s1.header')).toBeDisabled();
    });

    it('should expand a sandbox run to show its command and output', () => {
        const tool: ServerToolUse = {
            id: 's2',
            tool: ServerToolName.CodeInterpreter,
            status: ServerToolStatus.Error,
            sub_tool: 'bash',
            command: 'ls -la',
            output: 'permission denied',
            error_code: 'unavailable',
        };

        const {getByText, getByTestId, queryByText} = renderWithIntlAndTheme(<ServerToolCard tool={tool}/>);

        expect(getByText('Ran code in the provider sandbox')).toBeTruthy();
        expect(queryByText('ls -la')).toBeNull();

        fireEvent.press(getByTestId('agents.server_tool.s2.header'));

        expect(getByText('$')).toBeTruthy();
        expect(getByText('ls -la')).toBeTruthy();
        expect(getByText('permission denied')).toBeTruthy();
        expect(getByText('unavailable')).toBeTruthy();
    });

    it('should name a fetched page by its host', () => {
        const tool: ServerToolUse = {id: 's3', tool: ServerToolName.WebFetch, status: ServerToolStatus.Success, url: 'https://docs.mattermost.com/guide'};

        const {getByText} = renderWithIntlAndTheme(<ServerToolCard tool={tool}/>);

        expect(getByText('Fetched docs.mattermost.com')).toBeTruthy();
    });
});
