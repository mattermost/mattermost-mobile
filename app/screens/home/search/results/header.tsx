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

import Filter, {clearedState} from './filter';
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

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);
    const [showFilterIcon, setShowFilterIcon] = useState(false);

    const [filterState, setFilterState] = useState(clearedState);
    const [hasFilters, setHasFilters] = useState(false);

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

    useEffect(() => {
        setHasFilters(JSON.stringify(filterState) !== JSON.stringify(clearedState));
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
                                color={theme.centerChannelColor}
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

