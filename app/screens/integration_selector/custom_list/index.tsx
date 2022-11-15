// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {
    Text, Platform, FlatList, RefreshControl, View, SectionList,
} from 'react-native';

import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

export const FLATLIST = 'flat';
export const SECTIONLIST = 'section';
const INITIAL_BATCH_TO_RENDER = 15;

type UserProfileSection = {
    id: string;
    data: UserProfile[];
};
type DataType = DialogOption[] | Channel[] | UserProfile[] | UserProfileSection[];

type Props = {
    data: DataType;
    extraData?: any;
    canRefresh?: boolean;
    listType?: string;
    loading?: boolean;
    loadingComponent?: React.ReactElement<any, string> | null;
    noResults: () => JSX.Element | null;
    refreshing?: boolean;
    onRefresh?: () => void;
    onLoadMore: () => void;
    onRowPress: (item: UserProfile | Channel | DialogOption) => void;
    renderItem: (props: object) => JSX.Element;
    selectable?: boolean;
    theme?: object;
    shouldRenderSeparator?: boolean;
    testID?: string;
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
    onLoadMore, onRowPress, selectable, renderItem, theme,
    canRefresh = true, extraData, testID, refreshing = false, onRefresh,
}: Props) {
    const style = getStyleFromTheme(theme);

    // Callbacks
    const keyExtractor = (item: any): string => {
        return item.id || item.key || item.value || item;
    };

    // Renders
    const renderEmptyList = () => {
        return noResults || null;
    };

    const renderSeparator = () => {
        if (!shouldRenderSeparator) {
            return null;
        }

        return (
            <View style={style.separator}/>
        );
    };

    const renderListItem = ({item}: any) => {
        type listItemProps = {
            id: string;
            item: DialogOption | Channel | UserProfile;
            selected: boolean;
            selectable?: boolean;
            enabled: boolean;
            onPress: (item: DialogOption) => void;
        }

        const props: listItemProps = {
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

        return renderItem(props);
    };

    const renderFooter = (): React.ReactElement<any, string> | null => {
        if (!loading || !loadingComponent) {
            return null;
        }
        return loadingComponent;
    };

    const renderSectionHeader = ({section}: any) => {
        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{section.id}</Text>
                </View>
            </View>
        );
    };

    const renderSectionList = () => {
        return (
            <SectionList
                contentContainerStyle={style.container}
                extraData={loading}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onEndReached={onLoadMore() as any}
                removeClippedSubviews={true}
                renderItem={renderListItem}
                renderSectionHeader={renderSectionHeader}
                scrollEventThrottle={60}
                sections={data as UserProfileSection[]}
                style={style.list}
                stickySectionHeadersEnabled={false}
                testID={testID}
            />
        );
    };

    const renderFlatList = () => {
        let refreshControl;
        if (canRefresh) {
            refreshControl = (
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />);
        }

        return (
            <FlatList
                contentContainerStyle={style.container}
                data={data}
                extraData={extraData}
                keyboardShouldPersistTaps='always'
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmptyList()}
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                onEndReached={onLoadMore() as any}
                refreshControl={refreshControl}
                removeClippedSubviews={true}
                renderItem={renderListItem}
                scrollEventThrottle={60}
                style={style.list}
                testID={testID}
            />
        );
    };

    if (listType === FLATLIST) {
        return renderFlatList();
    }

    return renderSectionList();
}

export default CustomList;
