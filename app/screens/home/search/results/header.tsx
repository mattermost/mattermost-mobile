// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Filter from './filter';
import SelectButton from './header_button';

type Props = {
    onHeaderSelect: (val: string) => void;
    numberFiles: number;
    numberMessages: number;
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
            marginTop: 0,
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

const Header = ({onHeaderSelect, numberFiles, numberMessages}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const [filterDocuments, setFilterDocuments] = useState(false);
    const [filterSpreadsheets, setFilterSpreadsheets] = useState(false);
    const [filterPresentations, setFilterPresentations] = useState(false);
    const [filterCode, setFilterCode] = useState(false);
    const [filterImages, setFilterImages] = useState(false);
    const [filterAudio, setFilterAudio] = useState(false);
    const [filterVideos, setFilterVideos] = useState(false);

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);
    const [showFilterIcon, setShowFilterIcon] = useState(false);

    // console.log('filterVideos', filterVideos);
    const handleMessagesPress = useCallback(() => {
        onHeaderSelect('message-tab');
        setTab(0);
    }, [onHeaderSelect]);

    const handleFilesPress = useCallback(() => {
        onHeaderSelect('file-tab');
        setTab(1);
    }, [onHeaderSelect]);

    useEffect(() => {
        if (tab === 1) {
            setShowFilterIcon(true);
        } else if (tab === 0) {
            setShowFilterIcon(false);
        }
    }, [numberFiles, numberMessages, tab]);

    const renderContent = useCallback(() => {
        return (
            <Filter
                filterDocuments={filterDocuments}
                filterSpreadsheets={filterSpreadsheets}
                filterPresentations={filterPresentations}
                filterCode={filterCode}
                filterImages={filterImages}
                filterAudio={filterAudio}
                filterVideos={filterVideos}

                setFilterDocuments={setFilterDocuments}
                setFilterSpreadsheets={setFilterSpreadsheets}
                setFilterPresentations={setFilterPresentations}
                setFilterCode={setFilterCode}
                setFilterImages={setFilterImages}
                setFilterAudio={setFilterAudio}
                setFilterVideos={setFilterVideos}
            />
        );
    }, [
        filterDocuments, setFilterDocuments,
        filterSpreadsheets, setFilterSpreadsheets,
        filterPresentations, setFilterPresentations,
        filterCode, setFilterCode,
        filterImages, setFilterImages,
        filterAudio, setFilterAudio,
        filterVideos, setFilterVideos,
    ]);

    const handleFilterPress = useCallback(() => {
        bottomSheet({
            closeButtonId: 'close-search-filters',
            renderContent,
            snapPoints: [700, 10],
            theme,
            title: intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'}),
        });
    }, [renderContent,
        filterDocuments, setFilterDocuments,
        filterSpreadsheets, setFilterSpreadsheets,
        filterPresentations, setFilterPresentations,
        filterCode, setFilterCode,
        filterImages, setFilterImages,
        filterAudio, setFilterAudio,
        filterVideos, setFilterVideos,
    ]);

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
                        <CompassIcon
                            name={'filter-variant'}
                            size={24}
                            color={theme.centerChannelColor}
                            onPress={handleFilterPress}
                        />
                    }
                </View>
            </View>
            <View style={styles.divider}/>
        </>

    );
};

export default Header;

