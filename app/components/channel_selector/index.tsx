// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, View} from 'react-native';
import Animated, {FadeInDown, FadeOutDown} from 'react-native-reanimated';

import ChannelIcon from '@components/channel_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SelectedChip from '@components/selected_chip';
import {Channel} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelDropdown from './channel_dropdown';
import ChannelList from './channel_list';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    searchBar: {
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
        marginVertical: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedItemsContainer: {
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: {
            width: 0,
            height: -8,
        },
        backgroundColor: theme.centerChannelBg,
        maxHeight: 100,
    },
    selectedItems: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 20,
        height: 20,
        padding: 3,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.32),
        borderRadius: 12,
    },
}));

type ChannelSelectorProps = {
    adding?: boolean;
    canShowArchivedChannels?: boolean;
    channels: Channel[];
    itemSelectable?: boolean;
    itemSeparator?: boolean;
    loading: boolean;
    noResultsWithoutTerm?: string;
    selectedChannels?: Channel[];
    sharedChannelsEnabled?: boolean;
    typeOfChannels?: string;
    term: string;
    onChannelTypeChanged?: (channelType: string) => void;
    onSearchChannels: (term: string) => void;
    onSearchCancel: () => void;
    onEndReached: () => void;
    onSelectChannel: (channel: Channel) => void;
}

export default function ChannelSelector(props: ChannelSelectorProps) {
    const {
        sharedChannelsEnabled = false,
        canShowArchivedChannels = false,
        typeOfChannels = Channel.PUBLIC,
        onChannelTypeChanged,
        term,
        onSearchChannels,
        onSearchCancel,
        channels,
        selectedChannels = [],
        adding,
        loading,
        itemSeparator = true,
        itemSelectable,
        noResultsWithoutTerm,
        onEndReached,
        onSelectChannel,
    } = props;
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleSearch = useCallback(() => {
        onSearchChannels(term);
    }, [term, onSearchChannels]);

    const handleOnRemoveItem = useCallback((channelId: string) => {
        const channel = selectedChannels.find(({id}) => id === channelId);

        if (channel) {
            onSelectChannel(channel);
        }
    }, [selectedChannels]);

    const renderSelectedItems = useMemo(() => {
        const selectedItems = [];

        for (const channel of selectedChannels) {
            const icon = (
                <View style={styles.iconContainer}>
                    <ChannelIcon
                        name={channel.name}
                        shared={channel.shared}
                        type={channel.type}
                        size={14}
                        isUnread={true}
                    />
                </View>
            );

            selectedItems.push(
                <SelectedChip
                    id={channel.id}
                    key={channel.id}
                    text={channel.display_name}
                    extra={icon}
                    onRemove={handleOnRemoveItem}
                />,
            );
        }

        return selectedItems;
    }, [selectedChannels, handleOnRemoveItem]);

    return (
        <View style={styles.container}>
            {adding ? (
                <Loading
                    containerStyle={styles.loadingContainer}
                    size='large'
                    color={theme.buttonBg}
                />
            ) : (
                <>
                    <View
                        testID='browse_channels.screen'
                        style={styles.searchBar}
                    >
                        <Search
                            testID='browse_channels.search_bar'
                            placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                            cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            onChangeText={onSearchChannels}
                            onSubmitEditing={handleSearch}
                            onCancel={onSearchCancel}
                            autoCapitalize='none'
                            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                            value={term}
                        />
                    </View>
                    {(canShowArchivedChannels || sharedChannelsEnabled) && onChannelTypeChanged && (
                        <ChannelDropdown
                            onPress={onChannelTypeChanged}
                            typeOfChannels={typeOfChannels}
                            canShowArchivedChannels={canShowArchivedChannels}
                            sharedChannelsEnabled={sharedChannelsEnabled}
                        />
                    )}
                    <ChannelList
                        channels={channels}
                        selectedChannels={selectedChannels}
                        onEndReached={onEndReached}
                        loading={loading}
                        onSelectChannel={onSelectChannel}
                        term={term}
                        itemSeparator={itemSeparator}
                        itemSelectable={itemSelectable}
                        noResultsWithoutTerm={noResultsWithoutTerm}
                    />
                    {itemSelectable && selectedChannels.length !== 0 && (
                        <Animated.View
                            style={styles.selectedItemsContainer}
                            entering={FadeInDown.duration(200)}
                            exiting={FadeOutDown.duration(200)}
                        >
                            <ScrollView
                                contentContainerStyle={styles.selectedItems}
                            >
                                {renderSelectedItems}
                            </ScrollView>
                        </Animated.View>
                    )}
                </>
            )}
        </View>
    );
}
