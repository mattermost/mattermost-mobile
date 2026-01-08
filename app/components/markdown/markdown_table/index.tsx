// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {type LayoutChangeEvent, Platform, ScrollView, type StyleProp, TouchableOpacity, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {CELL_MAX_WIDTH, CELL_MIN_WIDTH} from '@components/markdown/markdown_table_cell';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const MAX_HEIGHT = 300;
const MAX_PREVIEW_COLUMNS = 5;

type MarkdownTableProps = {
    children: ReactNode;
    numColumns: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            maxHeight: MAX_HEIGHT,
        },
        expandButton: {
            height: 34,
            width: 34,
        },
        iconContainer: {
            maxWidth: '100%',
            alignItems: 'flex-end',
            paddingTop: 8,
            paddingBottom: 4,
            ...Platform.select({
                ios: {
                    paddingRight: 14,
                },
            }),
        },
        iconButton: {
            backgroundColor: theme.centerChannelBg,
            marginTop: -32,
            marginRight: -6,
            borderWidth: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 50,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: 34,
            height: 34,
        },
        icon: {
            fontSize: 14,
            color: theme.linkColor,
            ...Platform.select({
                ios: {
                    fontSize: 13,
                },
            }),
        },
        displayFlex: {
            flex: 1,
        },
        table: {
            width: '100%',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
        },
        tablePadding: {
            paddingRight: 10,
        },
        moreBelow: {
            bottom: Platform.select({
                ios: 34,
                android: 33.75,
            }),
            height: 20,
            position: 'absolute',
            left: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        moreRight: {
            maxHeight: MAX_HEIGHT,
            position: 'absolute',
            top: 0,
            width: 20,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
        },
    };
});

function MarkdownTable({children, numColumns}: MarkdownTableProps) {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const [maxPreviewColumns, setMaxPreviewColumns] = useState(0);
    const colsSliced = useRef(false);
    const rowsSliced = useRef(false);
    const styles = getStyleSheet(theme);

    const shouldRenderAsFlex = useCallback((isFullView = false) => {
        const isLandscape = dimensions.width > dimensions.height;
        if (isTablet) {
            return true;
        }

        // render as flex in the channel screen, only for mobile phones on the portrait mode,
        // and if tables have 2 ~ 4 columns
        if (!isFullView && numColumns > 1 && numColumns < 4 && !isTablet) {
            return true;
        }

        // render a 4 column table as flex when in landscape mode only
        // otherwise it should expand beyond the device's full width
        if (!isFullView && isLandscape && numColumns === 4) {
            return true;
        }

        // render as flex in full table screen
        if (isFullView && numColumns >= 3 && numColumns <= 4 && !isTablet) {
            return true;
        }

        return false;
    }, [dimensions.width, dimensions.height, numColumns, isTablet]);

    const getTableWidth = useCallback((isFullView = false) => {
        const columns = Math.min(numColumns, maxPreviewColumns);

        if (isFullView && isTablet) {
            // 10 is the padding on the table container
            return dimensions.width - 10;
        }

        return (isFullView || columns === 1) ? columns * CELL_MAX_WIDTH : columns * CELL_MIN_WIDTH;
    }, [numColumns, maxPreviewColumns, isTablet, dimensions.width]);

    const getTableStyle = useCallback((isFullView: boolean) => {
        const style = getStyleSheet(theme);
        const tableStyle: StyleProp<ViewStyle> = [style.table];

        const renderAsFlex = shouldRenderAsFlex(isFullView);
        if (renderAsFlex) {
            tableStyle.push(style.displayFlex);
            return tableStyle;
        }

        tableStyle.push({width: getTableWidth(isFullView)});
        return tableStyle;
    }, [theme, shouldRenderAsFlex, getTableWidth]);

    const renderRows = useCallback((isFullView = false, isPreview = false) => {
        const tableStyle = getTableStyle(isFullView);

        let rows = React.Children.toArray(children) as React.ReactElement[];
        if (isPreview) {
            const prevRowLength = rows.length;
            const prevColLength = React.Children.toArray(rows[0].props.children).length;

            rows = rows.slice(0, maxPreviewColumns).map((row) => {
                const theChildren = React.Children.toArray(row.props.children).slice(0, maxPreviewColumns);
                return {
                    ...row,
                    props: {
                        ...row.props,
                        children: theChildren,
                    },
                };
            });

            if (!rows.length) {
                return null;
            }

            rowsSliced.current = prevRowLength > rows.length;
            colsSliced.current = prevColLength > React.Children.toArray(rows[0].props.children).length;
        }

        // Add an extra prop to the last row of the table so that it knows not to render a bottom border
        // since the container should be rendering that
        rows[rows.length - 1] = React.cloneElement(rows[rows.length - 1], {
            isLastRow: true,
        });

        // Add an extra prop to the first row of the table so that it can have a different background color
        rows[0] = React.cloneElement(rows[0], {
            isFirstRow: true,
        });

        return (
            <View style={tableStyle}>
                {rows}
            </View>
        );
    }, [children, getTableStyle, maxPreviewColumns]);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.TABLE;
        const passProps = {
            renderAsFlex: false,
            width: getTableWidth(true),
        };
        CallbackStore.setCallback(renderRows);

        navigateToScreen(screen, passProps);
    }, [getTableWidth, renderRows]));

    const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    }, []);

    const handleContentSizeChange = useCallback((_: number, height: number) => {
        setContentHeight(height);
    }, []);

    const renderPreviewRows = useCallback((isFullView = false) => {
        return renderRows(isFullView, true);
    }, [renderRows]);

    useEffect(() => {
        const maxCols = Math.floor(dimensions.width / CELL_MIN_WIDTH);
        setMaxPreviewColumns(maxCols);
    }, [dimensions.width]);

    const tableWidth = useMemo(() => getTableWidth(), [getTableWidth]);
    const renderAsFlex = useMemo(() => shouldRenderAsFlex(), [shouldRenderAsFlex]);
    const previewRows = useMemo(() => renderPreviewRows(), [renderPreviewRows]);
    const leftOffset = useMemo(() => {
        if (renderAsFlex || tableWidth > containerWidth) {
            return containerWidth - 20;
        }
        return tableWidth - 20;
    }, [containerWidth, tableWidth, renderAsFlex]);

    // Renders when the columns were sliced, or the table width exceeds the container,
    // or if the columns exceed maximum allowed for previews
    const moreRight = useMemo(() => {
        if (colsSliced.current ||
                (containerWidth && tableWidth > containerWidth && !renderAsFlex) ||
                (numColumns > MAX_PREVIEW_COLUMNS)) {
            return (
                <LinearGradient
                    colors={[
                        changeOpacity(theme.centerChannelColor, 0.0),
                        changeOpacity(theme.centerChannelColor, 0.1),
                    ]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[styles.moreRight, {height: contentHeight, left: leftOffset}]}
                />
            );
        }
        return null;
    }, [containerWidth, tableWidth, renderAsFlex, numColumns, theme.centerChannelColor, styles.moreRight, contentHeight, leftOffset]);

    const moreBelow = useMemo(() => {
        if (rowsSliced.current || contentHeight > MAX_HEIGHT) {
            const width = renderAsFlex ? '100%' : Math.min(tableWidth, containerWidth);

            return (
                <LinearGradient
                    colors={[
                        changeOpacity(theme.centerChannelColor, 0.0),
                        changeOpacity(theme.centerChannelColor, 0.1),
                    ]}
                    style={[styles.moreBelow, {width}]}
                />
            );
        }
        return null;
    }, [contentHeight, renderAsFlex, tableWidth, containerWidth, theme.centerChannelColor, styles.moreBelow]);

    const expandButton = useMemo(() => {
        let expandButtonOffset = leftOffset;
        if (Platform.OS === 'android') {
            expandButtonOffset -= 10;
        }

        let component = null;
        if (expandButtonOffset > 0) {
            component = (
                <TouchableOpacity
                    onPress={handlePress}
                    style={[styles.expandButton, {left: expandButtonOffset}]}
                    testID='markdown_table.expand.button'
                >
                    <View style={[styles.iconContainer, {width: getTableWidth()}]}>
                        <View style={styles.iconButton}>
                            <CompassIcon
                                name='arrow-expand'
                                style={styles.icon}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }
        return component;
    }, [leftOffset, handlePress, styles.expandButton, styles.iconContainer, styles.iconButton, styles.icon, getTableWidth]);

    return (
        <TouchableOpacity
            style={styles.tablePadding}
            onPress={handlePress}
            testID='markdown_table'
        >
            <ScrollView
                onContentSizeChange={handleContentSizeChange}
                onLayout={handleContainerLayout}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={styles.container}
            >
                {previewRows}
            </ScrollView>
            {moreRight}
            {moreBelow}
            {expandButton}
        </TouchableOpacity>
    );
}

export default MarkdownTable;
