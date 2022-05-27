// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {FileModel} from '@app/database/models/server';
import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {isDocument, isImage, isVideo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Filter, {clearedState} from './filter';
import SelectButton from './header_button';

export type SelectTab = 'files' | 'messages'
type FilterFunction = (file: FileModel) => boolean

type Props = {
    onTabSelect: (tab: SelectTab) => void;
    numberMessages: number;
    files: FileModel[];
    setFilterFiles: (files: FileModel[]) => void;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 12,
            marginBottom: 12,
            flexGrow: 0,
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

const Header = ({onTabSelect, numberMessages, files, setFilterFiles}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);
    const [showFilterIcon, setShowFilterIcon] = useState(false);

    const [numberFiles, setNumberFiles] = useState(files.length);
    const [filterState, setFilterState] = useState(clearedState);
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
                    initialState={filterState}
                    setParentFilterState={setFilterState}
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
    }, [filterState]);

    // get only the active filter functions to reduce the total number of
    // function calls for each file
    const getActiveFilterFunctions = useCallback(() => {
        const filterArray: FilterFunction[] = [];
        if (filterState.Documents) {
            filterArray.push(isDocument);
        }

        if (filterState.Images) {
            filterArray.push(isImage);
        }

        if (filterState.Videos) {
            filterArray.push(isVideo);
        }
        return filterArray;
    }, [filterState]);

    const handleFilterFiles = useCallback(() => {
        if (JSON.stringify(filterState) === JSON.stringify(clearedState)) {
            console.log('No filters');
            setFilterFiles(files);
            setNumberFiles(files.length);
        } else {
            console.log('Has filters');
            const filteredFiles = [];
            const filterFunctions = getActiveFilterFunctions();
            for (const file of files) {
                for (const filterFunc of filterFunctions) {
                    if (filterFunc(file)) {
                        filteredFiles.push(file);
                    }
                }
            }
            setFilterFiles(filteredFiles);
            setNumberFiles(filteredFiles.length);
        }
    }, [getActiveFilterFunctions, setFilterFiles, hasFilters, files]);

    useEffect(() => {
        setHasFilters(JSON.stringify(filterState) !== JSON.stringify(clearedState));
        handleFilterFiles();
    }, [filterState, setHasFilters]);

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

