// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {useContext, type ComponentProps} from 'react';
import {Text} from 'react-native';

import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {BlockRenderer} from './block_renderer';
import {
    MmBlocksFieldUploadingContext,
    MmBlocksHasUploadingFieldsContext,
    MmBlocksRenderContext,
} from './context';
import {MmBlocksForm} from './form';
import {ContainerBlock} from './layout_blocks';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

jest.mock('./layout_blocks', () => ({
    ContainerBlock: jest.fn(),
}));

jest.mock('./mm_blocks_context_provider', () => {
    const ReactMock = require('react');
    const actual = jest.requireActual('./mm_blocks_context_provider');
    return {
        ...actual,
        MmBlocksContextProvider: jest.fn((props: React.PropsWithChildren<{
            channelId: string;
            postId: string;
            context?: BlockActionContext;
        }>) =>
            ReactMock.createElement(ReactMock.Fragment, null,
                ReactMock.createElement(require('react-native').Text, {testID: 'context-provider'}, `${props.channelId}:${props.postId}`),
                ReactMock.createElement(actual.MmBlocksContextProvider, props),
            ),
        ),
    };
});

jest.mock('./form', () => {
    const ReactMock = require('react');
    const actual = jest.requireActual('./form');
    return {
        ...actual,
        MmBlocksForm: jest.fn(({children}: {children: React.ReactNode}) =>
            ReactMock.createElement(ReactMock.Fragment, null,
                ReactMock.createElement(require('react-native').Text, {testID: 'mm-blocks-form'}),
                children,
            ),
        ),
    };
});

function UploadProbe() {
    const setFieldUploading = useContext(MmBlocksFieldUploadingContext);
    const hasUploadingFields = useContext(MmBlocksHasUploadingFieldsContext);
    const renderContext = useContext(MmBlocksRenderContext);

    return (
        <Text
            testID='upload-probe'

            // Expose the setter for tests without nesting another driver component.
            // @ts-expect-error test helper surface
            setFieldUploading={setFieldUploading}
        >
            {JSON.stringify({
                hasUploadingFields,
                blocksContext: renderContext?.context,
                hasSetter: typeof setFieldUploading === 'function',
            })}
        </Text>
    );
}

describe('BlockRenderer', () => {
    const theme = Preferences.THEMES.denim;
    const onAction = jest.fn();
    const blocks: MmBlock[] = [
        {type: 'text', text: 'Hello'},
        {type: 'divider'},
    ];

    function renderRenderer(props: Partial<ComponentProps<typeof BlockRenderer>> = {}) {
        return renderWithIntlAndTheme(
            <BlockRenderer
                blocks={blocks}
                channelId='channel-id'
                errors={{}}
                location={Screens.CHANNEL}
                onErrorsChange={jest.fn()}
                postId='post-id'
                onAction={onAction}
                theme={theme}
                {...props}
            />,
        );
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(ContainerBlock).mockImplementation(({block}: {block: MmContainerBlock}) => (
            React.createElement(React.Fragment, null,
                React.createElement(Text, {testID: 'container-block'}, String(block.content?.length ?? 0)),
                React.createElement(UploadProbe),
            )
        ));
    });

    it('should wrap blocks in context provider and container block', () => {
        const {getByTestId} = renderRenderer();

        expect(getByTestId('context-provider')).toHaveTextContent('channel-id:post-id');
        expect(getByTestId('container-block')).toHaveTextContent('2');
        expect(jest.mocked(ContainerBlock)).toHaveBeenCalledWith(
            expect.objectContaining({
                block: {
                    type: 'container',
                    content: blocks,
                },
                onAction,
                theme,
            }),
            undefined,
        );
        expect(jest.mocked(MmBlocksContextProvider)).toHaveBeenCalledWith(
            expect.objectContaining({context: 'dialog'}),
            undefined,
        );
    });

    it('should pass context through to MmBlocksContextProvider', () => {
        const {getByTestId} = renderRenderer({context: 'post'});

        expect(jest.mocked(MmBlocksContextProvider)).toHaveBeenCalledWith(
            expect.objectContaining({context: 'post'}),
            undefined,
        );
        expect(JSON.parse(getByTestId('upload-probe').props.children).blocksContext).toBe('post');
    });

    it('should wrap blocks in MmBlocksForm by default', () => {
        const onErrorsChange = jest.fn();
        const errors = {title: 'Required'};
        const {getByTestId} = renderRenderer({errors, onErrorsChange});

        expect(getByTestId('mm-blocks-form')).toBeTruthy();
        expect(jest.mocked(MmBlocksForm)).toHaveBeenCalledWith(
            expect.objectContaining({errors, onErrorsChange}),
            undefined,
        );
    });

    it('should skip MmBlocksForm when omitForm is set', () => {
        const {queryByTestId} = renderRenderer({omitForm: true});

        expect(queryByTestId('mm-blocks-form')).toBeNull();
        expect(MmBlocksForm).not.toHaveBeenCalled();
        expect(queryByTestId('container-block')).toBeTruthy();
    });

    it('should track uploading fields and notify onUploadingChange', () => {
        const onUploadingChange = jest.fn();
        const {getByTestId} = renderRenderer({onUploadingChange});

        expect(JSON.parse(getByTestId('upload-probe').props.children)).toEqual({
            hasUploadingFields: false,
            blocksContext: 'dialog',
            hasSetter: true,
        });
        expect(onUploadingChange).toHaveBeenCalledWith(false);

        const setFieldUploading = getByTestId('upload-probe').props.setFieldUploading as (
            fieldName: string,
            uploading: boolean,
        ) => void;

        act(() => setFieldUploading('attachment', true));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(true);
        expect(onUploadingChange).toHaveBeenLastCalledWith(true);
        expect(onUploadingChange).toHaveBeenCalledTimes(2);

        act(() => setFieldUploading('document', true));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(true);
        expect(onUploadingChange).toHaveBeenCalledTimes(2);

        act(() => setFieldUploading('attachment', true));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(true);
        expect(onUploadingChange).toHaveBeenCalledTimes(2);

        act(() => setFieldUploading('attachment', false));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(true);
        expect(onUploadingChange).toHaveBeenCalledTimes(2);

        act(() => setFieldUploading('document', false));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(false);
        expect(onUploadingChange).toHaveBeenLastCalledWith(false);
        expect(onUploadingChange).toHaveBeenCalledTimes(3);

        act(() => setFieldUploading('document', false));
        expect(JSON.parse(getByTestId('upload-probe').props.children).hasUploadingFields).toBe(false);
        expect(onUploadingChange).toHaveBeenCalledTimes(3);
    });
});
