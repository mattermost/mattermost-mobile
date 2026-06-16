// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {fireEvent} from '@testing-library/react-native';
import React, {useContext, type ComponentProps} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Preferences, Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {ButtonElement} from './button_element';
import {MmBlocksLayoutWidthContext} from './context';
import {DividerBlock} from './divider_block';
import {ImageBlock} from './image_block';
import {BlockSwitch, ContainerBlock} from './layout_blocks';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import {StaticSelectElement} from './static_select_element';
import {getStyleSheet} from './styles';
import {TextBlock} from './text_block';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('@store/callback_store', () => ({
    __esModule: true,
    default: {
        setCallback: jest.fn(),
    },
}));

jest.mock('./text_block', () => ({
    TextBlock: jest.fn(),
}));

jest.mock('./image_block', () => ({
    ImageBlock: jest.fn(),
}));

jest.mock('./divider_block', () => ({
    DividerBlock: jest.fn(),
}));

jest.mock('./button_element', () => ({
    ButtonElement: jest.fn(),
}));

jest.mock('./static_select_element', () => ({
    StaticSelectElement: jest.fn(),
}));

describe('layout_blocks', () => {
    const theme = Preferences.THEMES.denim;
    const containerStyles = getStyleSheet(theme);
    const onAction = jest.fn();

    function getOuterContainerView(result: ReturnType<typeof renderWithContext>) {
        const {UNSAFE_getAllByType: getAllByType} = result;
        return getAllByType(View).find((view) => typeof view.props.onLayout === 'function');
    }

    function getInnerContainerView(result: ReturnType<typeof renderWithContext>) {
        const {UNSAFE_getAllByType: getAllByType} = result;
        return getAllByType(View).find((view) => {
            const style = StyleSheet.flatten(view.props.style);
            return style.minWidth === 0 && ('flexDirection' in style || 'gap' in style);
        });
    }

    function getColumnSetView(result: ReturnType<typeof renderWithContext>) {
        const {UNSAFE_getAllByType: getAllByType} = result;
        return getAllByType(View).find((view) => {
            const style = StyleSheet.flatten(view.props.style);
            return style.flexDirection === 'row' && style.flexWrap === 'wrap' && style.width === '100%';
        });
    }

    function getColumnBlockViews(result: ReturnType<typeof renderWithContext>) {
        const {UNSAFE_getAllByType: getAllByType} = result;
        return getAllByType(View).filter((view) => {
            const style = StyleSheet.flatten(view.props.style);
            if (!style) {
                return false;
            }

            const isStretch = style.flexGrow === containerStyles.columnStretch.flexGrow &&
                style.flexBasis === containerStyles.columnStretch.flexBasis;
            const isAuto = style.flexGrow === containerStyles.columnAuto.flexGrow &&
                style.flexShrink === containerStyles.columnAuto.flexShrink;
            return isStretch || isAuto;
        });
    }

    function getColumnInnerContainerView(result: ReturnType<typeof renderWithContext>) {
        const {UNSAFE_getAllByType: getAllByType} = result;
        return getAllByType(View).find((view) => {
            const style = StyleSheet.flatten(view.props.style);
            return style.minWidth === 0 &&
                style.flexDirection === 'column' &&
                style.width !== '100%';
        });
    }

    function getColumnSetProps(
        overrides: Partial<MmColumnSetBlock> & Pick<MmColumnSetBlock, 'columns'>,
    ): MmColumnSetBlock {
        return {
            type: 'column_set',
            ...overrides,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();

        jest.mocked(TextBlock).mockImplementation((props: ComponentProps<typeof TextBlock>) => (
            React.createElement(
                View,
                {testID: 'block-switch.text-block', ...props},
                React.createElement(Text, null, props.block.text),
            )
        ));

        jest.mocked(ImageBlock).mockImplementation((props: ComponentProps<typeof ImageBlock>) => {
            const layoutWidth = useContext(MmBlocksLayoutWidthContext);
            return React.createElement(
                View,
                {testID: 'block-switch.image-block', ...props},
                `${props.block.url}|${layoutWidth ?? 'unset'}`,
            );
        });

        jest.mocked(DividerBlock).mockImplementation((props: ComponentProps<typeof DividerBlock>) => (
            React.createElement(View, {testID: 'block-switch.divider-block', ...props}, 'divider')
        ));

        jest.mocked(ButtonElement).mockImplementation((props: ComponentProps<typeof ButtonElement>) => (
            React.createElement(View, {testID: 'block-switch.button-element', ...props}, props.element.text)
        ));

        jest.mocked(StaticSelectElement).mockImplementation((props: ComponentProps<typeof StaticSelectElement>) => (
            React.createElement(View, {testID: 'block-switch.static-select', ...props}, props.element.action_id)
        ));
    });

    function renderWithContext(ui: React.ReactElement) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                {ui}
            </MmBlocksContextProvider>,
        );
    }

    function getSwitchProps(block: MmBlock): ComponentProps<typeof BlockSwitch> {
        return {block, onAction, theme};
    }

    function getContainerProps(block: MmContainerBlock): ComponentProps<typeof ContainerBlock> {
        return {block, onAction, theme};
    }

    function getCollapsibleProps(
        overrides: Partial<MmCollapsibleBlock> & Pick<MmCollapsibleBlock, 'header' | 'content'>,
    ): MmCollapsibleBlock {
        return {
            type: 'collapsible',
            ...overrides,
        };
    }

    function getCollapsibleContentWrapper(
        getByText: ReturnType<typeof renderWithContext>['getByText'],
        label: string,
    ) {
        let node: ReturnType<typeof getByText> | null = getByText(label, {includeHiddenElements: true});
        while (node?.parent) {
            node = node.parent;
            if (node.props.pointerEvents === 'none' || node.props.pointerEvents === 'auto') {
                return node;
            }
        }

        throw new Error(`Collapsible content wrapper not found for "${label}"`);
    }

    function getCollapsibleContentLayoutView(
        getByText: ReturnType<typeof renderWithContext>['getByText'],
        label: string,
    ) {
        const wrapper = getCollapsibleContentWrapper(getByText, label);
        const layoutView = wrapper.children[0];
        if (typeof layoutView === 'string') {
            throw new Error(`Collapsible content layout view not found for "${label}"`);
        }

        return layoutView;
    }

    function measureCollapsibleContent(
        getByText: ReturnType<typeof renderWithContext>['getByText'],
        label: string,
        height = 48,
    ) {
        const layoutView = getCollapsibleContentLayoutView(getByText, label);
        fireEvent(layoutView, 'layout', {
            nativeEvent: {layout: {width: 300, height, x: 0, y: 0}},
        });
    }

    function expectCollapsibleContentVisibility(
        queries: Pick<ReturnType<typeof renderWithContext>, 'getByText'>,
        label: string,
        visible: boolean,
    ) {
        const wrapper = getCollapsibleContentWrapper(queries.getByText, label);

        if (visible) {
            measureCollapsibleContent(queries.getByText, label);
            expect(queries.getByText(label)).toBeTruthy();
            expect(wrapper.props.pointerEvents).toBe('auto');
            return;
        }

        expect(queries.getByText(label, {includeHiddenElements: true})).not.toBeVisible();
        expect(wrapper.props.pointerEvents).toBe('none');
        expect(StyleSheet.flatten(wrapper.props.style).opacity).toBe(0);
    }

    describe('BlockSwitch', () => {
        it('should return null for unsupported block types', () => {
            const {toJSON} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps({type: 'unknown' as 'text', text: 'x'})}
                />,
            );
            expect(toJSON()).toBeNull();
        });

        it('should return null for column blocks', () => {
            const {toJSON} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps({
                        type: 'column',
                        width: 'stretch',
                        items: [{type: 'text', text: 'Column body'}],
                    })}
                />,
            );

            expect(toJSON()).toBeNull();
            expect(jest.mocked(TextBlock)).not.toHaveBeenCalled();
            expect(jest.mocked(ImageBlock)).not.toHaveBeenCalled();
            expect(jest.mocked(DividerBlock)).not.toHaveBeenCalled();
            expect(jest.mocked(ButtonElement)).not.toHaveBeenCalled();
            expect(jest.mocked(StaticSelectElement)).not.toHaveBeenCalled();
        });

        it('should render TextBlock for text blocks', () => {
            const block: MmTextBlock = {type: 'text', text: 'Block text'};
            const {getByTestId} = renderWithContext(
                <BlockSwitch {...getSwitchProps(block)}/>,
            );

            expect(getByTestId('block-switch.text-block')).toHaveTextContent('Block text');
            expect(getByTestId('block-switch.text-block')).toHaveProp('block', block);
        });

        it('should render ImageBlock for image blocks', () => {
            const block: MmImageBlock = {
                type: 'image',
                url: 'https://example.com/photo.png',
                alt_text: 'Photo',
            };
            const {getByTestId} = renderWithContext(
                <BlockSwitch {...getSwitchProps(block)}/>,
            );

            expect(getByTestId('block-switch.image-block')).toHaveTextContent('https://example.com/photo.png|unset');
            expect(getByTestId('block-switch.image-block')).toHaveProp('block', block);
        });

        it('should render DividerBlock for divider blocks', () => {
            const {getByTestId} = renderWithContext(
                <BlockSwitch {...getSwitchProps({type: 'divider'})}/>,
            );

            expect(getByTestId('block-switch.divider-block')).toHaveTextContent('divider');
            expect(getByTestId('block-switch.divider-block')).toHaveProp('theme', theme);
        });

        it('should render ButtonElement for button blocks', () => {
            const block: MmButtonBlock = {
                type: 'button',
                text: 'Click me',
                action_id: 'action_1',
            };
            const {getByTestId} = renderWithContext(
                <BlockSwitch {...getSwitchProps(block)}/>,
            );

            expect(getByTestId('block-switch.button-element')).toHaveTextContent('Click me');
            expect(getByTestId('block-switch.button-element')).toHaveProp('element', block);
        });

        it('should render StaticSelectElement for static_select blocks', () => {
            const block: MmStaticSelectBlock = {
                type: 'static_select',
                action_id: 'pick_one',
                placeholder: 'Choose',
                options: [{text: 'Alpha', value: 'a'}],
            };
            const {getByTestId} = renderWithContext(
                <BlockSwitch {...getSwitchProps(block)}/>,
            );

            expect(getByTestId('block-switch.static-select')).toHaveTextContent('pick_one');
            expect(getByTestId('block-switch.static-select')).toHaveProp('element', block);
        });
    });

    describe('ContainerBlock', () => {
        it('should return null when container content is empty', () => {
            const {toJSON} = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        content: [],
                    })}
                />,
            );
            expect(toJSON()).toBeNull();
        });

        it('should render bounded container when max_height is set', () => {
            const {getByTestId} = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        max_height: 'small',
                        content: [{type: 'text', text: 'Clipped body'}],
                    })}
                />,
            );

            expect(getByTestId('mm_blocks.container.bounded')).toBeTruthy();
            expect(getByTestId('block-switch.text-block')).toHaveTextContent('Clipped body');
        });

        it('should navigate to expanded content screen when bounded container expands', () => {
            const {getByTestId, UNSAFE_getByType: getByType} = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        max_height: 'small',
                        content: [{type: 'text', text: 'Expand me'}],
                    })}
                />,
            );

            fireEvent(getByType(ScrollView), 'layout', {
                nativeEvent: {layout: {width: 300, height: 100, x: 0, y: 0}},
            });
            fireEvent(getByType(ScrollView), 'contentSizeChange', 0, 500);

            fireEvent.press(getByTestId('mm_blocks.container.bounded.expand.button'));

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    channelId: 'channel-id',
                    postId: 'post-id',
                    location: Screens.CHANNEL,
                }),
            );
            expect(navigateToScreen).toHaveBeenCalledWith(Screens.MM_BLOCKS_CONTENT);
        });

        it('should apply border style when border is true', () => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        border: true,
                        content: [{type: 'text', text: 'Bordered'}],
                    })}
                />,
            );

            expect(StyleSheet.flatten(getOuterContainerView(result)?.props.style)).toEqual(
                expect.objectContaining(containerStyles.containerBorder),
            );
        });

        it('should apply gray background when background is gray', () => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        background: 'gray',
                        content: [{type: 'text', text: 'Gray background'}],
                    })}
                />,
            );

            expect(StyleSheet.flatten(getOuterContainerView(result)?.props.style)).toEqual(
                expect.objectContaining(containerStyles.containerBgGray),
            );
        });

        it('should apply vertical flow by default and horizontal flow when requested', () => {
            const verticalResult = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        content: [{type: 'text', text: 'Vertical'}],
                    })}
                />,
            );
            expect(StyleSheet.flatten(getInnerContainerView(verticalResult)?.props.style)).toEqual(
                expect.objectContaining(containerStyles.containerVertical),
            );

            const horizontalResult = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        flow: 'horizontal',
                        content: [{type: 'text', text: 'Horizontal'}],
                    })}
                />,
            );
            expect(StyleSheet.flatten(getInnerContainerView(horizontalResult)?.props.style)).toEqual(
                expect.objectContaining(containerStyles.containerHorizontal),
            );
        });

        it('should apply gap style from block gap prop', () => {
            const noneResult = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        gap: 'none',
                        content: [{type: 'text', text: 'No gap'}],
                    })}
                />,
            );
            expect(StyleSheet.flatten(getInnerContainerView(noneResult)?.props.style)).toEqual(
                expect.objectContaining({gap: 0}),
            );

            const smallResult = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        gap: 'small',
                        content: [{type: 'text', text: 'Small gap'}],
                    })}
                />,
            );
            expect(StyleSheet.flatten(getInnerContainerView(smallResult)?.props.style)).toEqual(
                expect.objectContaining({gap: 8}),
            );
        });

        it.each([
            ['primary', 'accentPrimary'],
            ['good', 'accentGood'],
            ['warning', 'accentWarning'],
            ['danger', 'accentDanger'],
            ['default', 'accentDefault'],
        ] as const)('should apply semantic accent style for %s', (accentColor, styleKey) => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        accent_color: accentColor,
                        content: [{type: 'text', text: `${accentColor} accent`}],
                    })}
                />,
            );

            const outerStyle = StyleSheet.flatten(getOuterContainerView(result)?.props.style);
            expect(outerStyle).toEqual(expect.objectContaining(containerStyles.containerAccent));
            expect(outerStyle).toEqual(expect.objectContaining(containerStyles[styleKey]));
        });

        it('should apply custom accent color', () => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        accent_color: '#2d81ff',
                        content: [{type: 'text', text: 'Custom accent'}],
                    })}
                />,
            );

            const outerStyle = StyleSheet.flatten(getOuterContainerView(result)?.props.style);
            expect(outerStyle).toEqual(expect.objectContaining(containerStyles.containerAccent));
            expect(outerStyle).toEqual(expect.objectContaining({borderLeftColor: '#2d81ff'}));
        });

        it('should use parent layout width until container is measured', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <MmBlocksContextProvider
                    channelId='channel-id'
                    location={Screens.CHANNEL}
                    postId='post-id'
                    layoutWidth={256}
                >
                    <ContainerBlock
                        {...getContainerProps({
                            type: 'container',
                            content: [{type: 'image', url: 'https://example.com/a.png'}],
                        })}
                    />
                </MmBlocksContextProvider>,
            );

            expect(getByTestId('block-switch.image-block')).toHaveTextContent('https://example.com/a.png|256');
        });

        it('should measure layout width from onLayout and provide it to descendants', () => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        content: [{type: 'image', url: 'https://example.com/a.png'}],
                    })}
                />,
            );

            expect(result.getByTestId('block-switch.image-block')).toHaveTextContent(/unset$/);

            const outerContainer = getOuterContainerView(result);
            fireEvent(outerContainer!, 'layout', {
                nativeEvent: {layout: {width: 320.6, height: 100, x: 0, y: 0}},
            });

            expect(result.getByTestId('block-switch.image-block')).toHaveTextContent('https://example.com/a.png|321');
        });

        it('should ignore onLayout widths of zero', () => {
            const result = renderWithContext(
                <ContainerBlock
                    {...getContainerProps({
                        type: 'container',
                        content: [{type: 'image', url: 'https://example.com/a.png'}],
                    })}
                />,
            );

            fireEvent(getOuterContainerView(result)!, 'layout', {
                nativeEvent: {layout: {width: 0, height: 100, x: 0, y: 0}},
            });

            expect(result.getByTestId('block-switch.image-block')).toHaveTextContent(/unset$/);
        });
    });

    describe('ColumnSetBlock', () => {
        it('should return null when columns are empty', () => {
            const {toJSON} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({columns: []}))}
                />,
            );
            expect(toJSON()).toBeNull();
        });

        it('should render column set layout styles', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [
                            {
                                type: 'column',
                                width: 'stretch',
                                items: [{type: 'text', text: 'Left'}],
                            },
                            {
                                type: 'column',
                                width: 'auto',
                                items: [{type: 'text', text: 'Right'}],
                            },
                        ],
                    }))}
                />,
            );

            expect(StyleSheet.flatten(getColumnSetView(result)?.props.style)).toEqual(
                expect.objectContaining(containerStyles.columnSet),
            );
        });

        it('should apply gap style from column set gap prop', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        gap: 'large',
                        columns: [{
                            type: 'column',
                            width: 'stretch',
                            items: [{type: 'text', text: 'Column body'}],
                        }],
                    }))}
                />,
            );

            expect(StyleSheet.flatten(getColumnSetView(result)?.props.style)).toEqual(
                expect.objectContaining({gap: 16}),
            );
        });

        it('should render each column content', () => {
            const {getByText} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [
                            {
                                type: 'column',
                                width: 'stretch',
                                items: [{type: 'text', text: 'Left column'}],
                            },
                            {
                                type: 'column',
                                width: 'auto',
                                items: [{type: 'text', text: 'Right column'}],
                            },
                        ],
                    }))}
                />,
            );

            expect(getByText('Left column')).toBeTruthy();
            expect(getByText('Right column')).toBeTruthy();
        });
    });

    describe('ColumnBlock', () => {
        it('should skip columns with empty items', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [
                            {
                                type: 'column',
                                width: 'stretch',
                                items: [],
                            },
                            {
                                type: 'column',
                                width: 'auto',
                                items: [{type: 'text', text: 'Visible column'}],
                            },
                        ],
                    }))}
                />,
            );

            expect(getColumnSetView(result)).toBeTruthy();
            expect(getColumnBlockViews(result)).toHaveLength(1);
            expect(result.getByText('Visible column')).toBeTruthy();
        });

        it('should apply stretch and auto column width styles', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [
                            {
                                type: 'column',
                                width: 'stretch',
                                items: [{type: 'text', text: 'Stretch'}],
                            },
                            {
                                type: 'column',
                                width: 'auto',
                                items: [{type: 'text', text: 'Auto'}],
                            },
                        ],
                    }))}
                />,
            );

            const columnViews = getColumnBlockViews(result);
            expect(columnViews).toHaveLength(2);
            expect(StyleSheet.flatten(columnViews[0]?.props.style)).toEqual(
                expect.objectContaining(containerStyles.columnStretch),
            );
            expect(StyleSheet.flatten(columnViews[1]?.props.style)).toEqual(
                expect.objectContaining(containerStyles.columnAuto),
            );
        });

        it('should wrap column items in a container block', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [{
                            type: 'column',
                            width: 'stretch',
                            items: [
                                {type: 'text', text: 'First item'},
                                {type: 'text', text: 'Second item'},
                            ],
                        }],
                    }))}
                />,
            );

            expect(result.getByText('First item')).toBeTruthy();
            expect(result.getByText('Second item')).toBeTruthy();
            expect(getColumnInnerContainerView(result)).toBeTruthy();
        });

        it('should pass column gap to the inner container block', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getColumnSetProps({
                        columns: [{
                            type: 'column',
                            width: 'stretch',
                            gap: 'small',
                            items: [{type: 'text', text: 'Spaced items'}],
                        }],
                    }))}
                />,
            );

            expect(StyleSheet.flatten(getColumnInnerContainerView(result)?.props.style)).toEqual(
                expect.objectContaining({gap: 8}),
            );
        });
    });

    describe('CollapsibleBlock', () => {
        it('should toggle collapsed state and content visibility when header is pressed', () => {
            const result = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getCollapsibleProps({
                        collapsed: true,
                        header: [{type: 'text', text: 'Header'}],
                        content: [{type: 'text', text: 'Hidden details'}],
                    }))}
                />,
            );
            const {getByRole} = result;

            const header = getByRole('button');
            expect(header.props.accessibilityState).toEqual(expect.objectContaining({expanded: false}));
            expectCollapsibleContentVisibility(result, 'Hidden details', false);

            fireEvent.press(header);

            expect(getByRole('button').props.accessibilityState).toEqual(expect.objectContaining({expanded: true}));
            expectCollapsibleContentVisibility(result, 'Hidden details', true);
        });

        it.each([
            ['when collapsed is omitted', undefined, false],
            ['when collapsed is true', true, false],
            ['when collapsed is false', false, true],
        ] as const)('should respect collapsed prop %s', (_label, collapsed, expanded) => {
            const block = getCollapsibleProps({
                header: [{type: 'text', text: 'Header'}],
                content: [{type: 'text', text: 'Collapsible body'}],
                ...(collapsed === undefined ? {} : {collapsed}),
            });
            const result = renderWithContext(
                <BlockSwitch {...getSwitchProps(block)}/>,
            );
            const {getByRole} = result;

            expect(getByRole('button').props.accessibilityState).toEqual(
                expect.objectContaining({expanded}),
            );
            expectCollapsibleContentVisibility(result, 'Collapsible body', expanded);
        });

        it('should return null when header is missing', () => {
            const {toJSON} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getCollapsibleProps({
                        header: [],
                        content: [{type: 'text', text: 'Body'}],
                    }))}
                />,
            );
            expect(toJSON()).toBeNull();
        });

        it('should return null when content is missing', () => {
            const {toJSON} = renderWithContext(
                <BlockSwitch
                    {...getSwitchProps(getCollapsibleProps({
                        header: [{type: 'text', text: 'Header'}],
                        content: [],
                    }))}
                />,
            );
            expect(toJSON()).toBeNull();
        });
    });
});
