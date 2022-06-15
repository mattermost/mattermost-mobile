// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {FileFilter} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Filter from './filter';
import SelectButton from './header_button';

export type SelectTab = 'files' | 'messages'

type Props = {
    onTabSelect: (tab: SelectTab) => void;
    onFilterChanged: (filter: FileFilter) => void;
    selectedTab: SelectTab;
    selectedFilter: FileFilter;
    numberMessages: number;
    numberFiles: number;
}

export const HEADER_HEIGHT = 64;

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
            marginHorizontal: 12,
            flexDirection: 'row',
            paddingVertical: 12,
            flexGrow: 0,
            height: HEADER_HEIGHT,
            alignItems: 'center',
        },
        filter: {
            marginRight: 12,
            marginLeft: 'auto',
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

const Header = ({
    onTabSelect,
    onFilterChanged,
    numberMessages,
    numberFiles,
    selectedTab,
    selectedFilter,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const showFilterIcon = selectedTab === 'files';
    const hasFilters = selectedFilter !== 'all';

    const handleMessagesPress = useCallback(() => {
        onTabSelect('messages');
    }, [onTabSelect]);

    const handleFilesPress = useCallback(() => {
        onTabSelect('files');
    }, [onTabSelect]);

    const handleFilterPress = useCallback(() => {
        const renderContent = () => {
            return (
                <Filter
                    initialFilter={selectedFilter}
                    setFilter={onFilterChanged}
                />
            );
        };
        bottomSheet({
            closeButtonId: 'close-search-filters',
            renderContent,
            snapPoints: [700, 10],
            theme,
            title: intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'}),
        });
    }, [selectedFilter]);

    return (
        <>
            <View style={styles.container}>
                <SelectButton
                    selected={selectedTab === 'messages'}
                    onPress={handleMessagesPress}
                    text={`${messagesText} (${numberMessages})`}
                />
                <SelectButton
                    selected={selectedTab === 'files'}
                    onPress={handleFilesPress}
                    text={`${filesText} (${numberFiles})`}
                />
                <View
                    style={styles.filter}
                >
                    {showFilterIcon &&
                    <>
                        <CompassIcon
                            name={'filter-variant'}
                            size={24}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            onPress={handleFilterPress}
                        />
                        <Badge
                            borderColor={theme.buttonBg}
                            backgroundColor={theme.buttonBg}
                            visible={hasFilters}
                            testID={'search.filters.badge'}
                            value={-1}
                        />
                    </>
                    }
                </View>
            </View>
            <View style={styles.divider}/>
        </>

    );
};

export default Header;

