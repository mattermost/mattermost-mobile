// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Filter, {SelectedFilter} from './filter';
import SelectButton from './header_button';

export type SelectTab = 'files' | 'messages'

type Props = {
    onTabSelect: (tab: SelectTab) => void;
    numberMessages: number;
    fileInfos: FileInfo[];
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

const Header = ({onTabSelect, numberMessages, fileInfos}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);
    const [showFilterIcon, setShowFilterIcon] = useState(false);

    const [numberFiles, setNumberFiles] = useState(fileInfos.length);
    const [filter, setFilter] = useState<SelectedFilter>('All file types');
    const [hasFilters, setHasFilters] = useState(false);

    const handleMessagesPress = useCallback(() => {
        onTabSelect('messages');
        setTab(0);
    }, [onTabSelect]);

    const handleFilesPress = useCallback(() => {
        onTabSelect('files');
        setTab(1);
    }, [onTabSelect]);

    useEffect(() => {
        if (tab === 1) {
            setShowFilterIcon(true);
        } else if (tab === 0) {
            setShowFilterIcon(false);
        }
    }, [numberFiles, numberMessages, tab]);

    const handleFilterPress = useCallback(() => {
        const renderContent = () => {
            return (
                <Filter
                    initialFilter={filter}
                    setFilter={setFilter}
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
    }, [filter]);

    const handleFilterFiles = useCallback(() => {
        setNumberFiles(Object.keys(fileInfos).length);
    }, [hasFilters, fileInfos]);

    useEffect(() => {
        setHasFilters(filter !== 'All file types');
        handleFilterFiles();
    }, [filter, setHasFilters]);

    return (
        <>
            <View style={styles.container}>
                <SelectButton
                    selected={tab === 0}
                    onPress={handleMessagesPress}
                    text={`${messagesText} (${numberMessages})`}
                />
                <SelectButton
                    selected={tab === 1}
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

