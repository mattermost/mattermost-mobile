// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import NavigationHeader from '@app/components/navigation_header';
import OtherMentionsBadge from '@app/components/other_mentions_badge';
import RoundedHeaderContext from '@app/components/rounded_header_context';
import {Screens} from '@app/constants';
import {useIsTablet} from '@app/hooks/device';
import {useDefaultHeaderHeight} from '@app/hooks/header';
import {useTeamSwitch} from '@app/hooks/team_switch';
import {edges} from '@app/screens/global_threads/global_threads';

import {popTopScreen} from '../navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId?: AvailableScreens;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalDrafts = ({componentId}: Props) => {
    const intl = useIntl();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();

    const defaultHeight = useDefaultHeaderHeight();

    const headerLeftComponent = useMemo(() => {
        if (isTablet) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={Screens.GLOBAL_DRAFTS}/>);
    }, [isTablet]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight;
        return {flex: 1, marginTop};
    }, [defaultHeight]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_drafts.screen'
        >
            <NavigationHeader
                showBackButton={!isTablet}
                isLargeTitle={false}
                onBackPress={onBackPress}
                title={
                    intl.formatMessage({
                        id: 'Drafts',
                        defaultMessage: 'Drafts',
                    })
                }
                leftComponent={headerLeftComponent}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {!switchingTeam &&
            <View style={containerStyle}>
                <Text>{'Global Drafts'}</Text>
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalDrafts;
