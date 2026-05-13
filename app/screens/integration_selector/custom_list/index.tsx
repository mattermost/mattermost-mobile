// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList, Platform, RefreshControl, View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';

import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const INITIAL_BATCH_TO_RENDER = 15;

type DataType = DialogOption[] | Channel[];
type ListItemProps = {
    id: string;
    item: DialogOption | Channel;
    selected: boolean;
    selectable?: boolean;
    enabled: boolean;
    onPress: (item: DialogOption) => void;
}

type Props = {
    data: DataType;
    canRefresh?: boolean;
    loading?: boolean;
    loadingComponent?: React.ReactElement<any, string> | null;
    noResults: () => React.ReactNode;
    refreshing?: boolean;
    onRefresh?: () => void;
    onLoadMore: () => void;
    onRowPress: (item: Channel | DialogOption) => void;
    renderItem: (props: ListItemProps) => React.ReactNode;
    selectable?: boolean;
    theme: Theme;
    shouldRenderSeparator?: boolean;
    testID?: string;
}

const keyExtractor = (item: any): string => {
    return item.id || item.key || item.value || item;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {flex: 1},
        list: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

function CustomList({
    data, shouldRenderSeparator, loading, loadingComponent, noResults,
    onLoadMore, onRowPress, selectable, renderItem, theme,
    canRefresh = true, testID, refreshing = false, onRefresh,
}: Props) {
    const style = getStyleFromTheme(theme);

    // Renders
    const renderEmptyList = useCallback(() => {
        return noResults || null;
    }, [noResults]);

    const renderSeparator = useCallback(() => {
        if (!shouldRenderSeparator) {
            return null;
        }

        return (
            <View style={style.separator}/>
        );
    }, [shouldRenderSeparator, style]);

    const renderListItem = useCallback(({item}: any): React.ReactElement | null => {
        const props: ListItemProps = {
            id: item.key,
            item,
            selected: item.selected,
            selectable,
            enabled: true,
            onPress: onRowPress,
        };

        if ('disableSelect' in item) {
            props.enabled = !item.disableSelect;
        }

        return (renderItem(props) ?? null) as React.ReactElement | null;
    }, [onRowPress, selectable, renderItem]);

    const renderFooter = useCallback((): React.ReactElement<any, string> | null => {
        if (!loading || !loadingComponent) {
            return null;
        }
        return loadingComponent;
    }, [loading, loadingComponent]);

    let refreshControl;
    if (canRefresh) {
        refreshControl = (
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
            />);
    }

    return (
        <KeyboardAvoidingView style={style.flex}>
            <FlatList
                data={data}
                keyboardShouldPersistTaps='always'
                keyboardDismissMode='on-drag'
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onEndReached={onLoadMore}
                refreshControl={refreshControl}
                removeClippedSubviews={true}
                renderItem={renderListItem}
                scrollEventThrottle={60}
                style={style.list}
                testID={testID}
            />
        </KeyboardAvoidingView>
    );
}

export default CustomList;
