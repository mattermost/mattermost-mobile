// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {FileFilter, FileFilters} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import TeamPickerIcon from '../team_picker_icon';

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
    setTeamId: (id: string) => void;
    teamId: string;
}

export const HEADER_ROUNDED_HEIGHT = 10;
export const HEADER_BUTTON_HEIGHT = 40;
export const HEADER_HEIGHT = HEADER_ROUNDED_HEIGHT + HEADER_BUTTON_HEIGHT;

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: HEADER_BUTTON_HEIGHT,
            backgroundColor: theme.centerChannelBg,
            marginBottom: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
            marginTop: 10,
        },
        filter: {
            alignItems: 'center',
            flexDirection: 'row',
            marginLeft: 'auto',
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

const Header = ({
    teamId,
    setTeamId,
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
    const title = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    const showFilterIcon = selectedTab === 'files';
    const hasFilters = selectedFilter !== FileFilters.ALL;

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
                    title={title}
                />
            );
        };
        bottomSheet({
            closeButtonId: 'close-search-filters',
            renderContent,
            snapPoints: [700, 10],
            theme,
            title,
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
                    <TeamPickerIcon
                        size={32}
                        divider={true}
                        setTeamId={setTeamId}
                        teamId={teamId}
                    />
                </View>
            </View>
            <View style={styles.divider}/>
        </>

    );
};

export default Header;

