import React, { useCallback, useState } from 'react';
import {
    Text, Platform, Keyboard, FlatList, RefreshControl, View, SectionList
} from 'react-native';

import { makeStyleSheetFromTheme, changeOpacity } from '@utils/theme';
import Visibility from '@constants/list';

export const FLATLIST = 'flat';
export const SECTIONLIST = 'section';
const INITIAL_BATCH_TO_RENDER = 15;
const SCROLL_UP_MULTIPLIER = 6;

type DataType = DialogOption[] | Channel[] | UserProfile[];

type Props = {
    data: DataType, // TODO?
    extraData?: any,
    canRefresh?: boolean,
    listType?: string,
    loading?: boolean,
    loadingComponent?: React.ReactElement<any, string> | null,
    noResults: () => JSX.Element | null,
    refreshing?: boolean,
    onRefresh?: () => void,
    onLoadMore: () => void,
    onRowPress?: (id: string, item: UserProfile | Channel | DialogOption) => any,
    onRowSelect?: () => void,
    renderItem: (props: object) => JSX.Element,
    selectable?: boolean,
    theme?: object,
    shouldRenderSeparator?: boolean,
    testID?: string,
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        list: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        container: {
            flexGrow: 1,
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        searching: {
            backgroundColor: theme.centerChannelBg,
            height: '100%',
            position: 'absolute',
            width: '100%',
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 10,
            paddingVertical: 2,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionText: {
            fontWeight: '600',
            color: theme.centerChannelColor,
        },
        noResultContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

function CustomList({
    data, shouldRenderSeparator, listType, loading, loadingComponent, noResults,
    onLoadMore, onRowPress, onRowSelect, selectable, renderItem, theme,
    canRefresh = true, extraData, testID, refreshing = false, onRefresh,
}: Props) {
    const style = getStyleFromTheme(theme);

    // Constructor Props
    let contentOffsetY = 0;
    const keyboardDismissProp = Platform.select({
        android: {
            OnScrollBeginDrag: Keyboard.dismiss,
        },
        ios: {
            keyboardDismissMode: 'on-drag',
        }
    });

    // Hooks
    const [listHeight, setListHeight] = useState(0);

    // Callbacks
    const handleLayout = (event: any) => {  // TODO
        const { height } = event.nativeEvent.layout;
        setListHeight(height);
    }

    const handleScroll = (event: any) => {  // TODO
        const pageOffsetY = event.nativeEvent.contentOffset.y;

        if (pageOffsetY > 0) {
            const contentHeight = event.nativeEvent.contentSize.height;
            const direction = (contentOffsetY < pageOffsetY) ?
                Visibility.VISIBILITY_SCROLL_UP :
                Visibility.VISIBILITY_SCROLL_DOWN;

            contentOffsetY = pageOffsetY;

            if (
                direction == Visibility.VISIBILITY_SCROLL_UP &&
                (contentHeight - pageOffsetY) < (listHeight * SCROLL_UP_MULTIPLIER)
            ) {
                onLoadMore();
            }
        }
    }

    const keyExtractor = (item: any, index: number): string => {
        return item.id || item.key || item.value || item;
    }

    const renderEmptyList = () => {
        return noResults || null;
    };

    const renderSeparator = () => {
        if (!shouldRenderSeparator) {
            return null;
        }

        const style = getStyleFromTheme(theme);

        return (
            <View style={style.separator} />
        );
    };

    const setListRef = (ref: any) => {
        // this.list = ref;
    };

    const renderListItem = ({ item, index, section }: any) => {  // TODO
        const props = {
            id: item.id,
            item,
            selected: item.selected,
            selectable,

            // TODO Can we do this?
            enabled: true,
            // onPress: null // TODO Type?
        };

        if ('disableSelect' in item) {
            props.enabled = !item.disableSelect;
        }

        // if (onRowSelect) {
        //     props.onPress = onRowSelect(section.title, index);
        // } else {
        //     props.onPress = onRowPress;
        // }

        return renderItem(props);
    }

    const renderFooter = (): React.ReactElement<any, string> | null => {
        if (!loading || !loadingComponent) {
            return null;
        }
        return loadingComponent;
    };

    const renderSectionHeader = ({ section }: any) => {
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{section.id}</Text>
                </View>
            </View>
        );
    };

    const renderSectionList = () => {
        const style = getStyleFromTheme(theme);

        return (
            <SectionList
                contentContainerStyle={style.container}
                extraData={loading}
                // keyboardShouldPersistTaps='always'
                // {...keyboardDismissProp}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onLayout={handleLayout}
                onScroll={handleScroll}
                ref={setListRef}
                removeClippedSubviews={true}
                renderItem={renderListItem}
                renderSectionHeader={renderSectionHeader}
                scrollEventThrottle={60}
                sections={[{ title: 'My Test Title', data: ['item1', 'item2'] }]}  // TODO (data)
                style={style.list}
                stickySectionHeadersEnabled={false}
                testID={testID}
            />
        );
    };

    const renderFlatList = () => {
        const style = getStyleFromTheme(theme);

        let refreshControl;
        if (canRefresh) {
            refreshControl = (
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                // colors={[theme.centerChannelColor]}
                // tintColor={theme.centerChannelColor}
                />);
        }

        return (
            <FlatList
                contentContainerStyle={style.container}
                data={data}
                extraData={extraData}
                // keyboardShouldPersistTaps='always'
                // {...keyboardDismissProp}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onLayout={handleLayout}
                onScroll={handleScroll}
                refreshControl={refreshControl}
                ref={setListRef}
                removeClippedSubviews={true}
                renderItem={renderItem}
                scrollEventThrottle={60}
                style={style.list}
                // stickySectionHeadersEnabled={true}
                testID={testID}
            />
        );
    }

    if (listType === FLATLIST) {
        return renderFlatList();
    }

    return renderSectionList();
}


export default CustomList;
