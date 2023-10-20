// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import Button from '@components/button';

import {ChannelNameInput} from './channel_name_input';
import {MessageBox} from './message_box';
import {TeamSelector} from './team_selector';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingVertical: 24,
            paddingHorizontal: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
        },
    };
});

type Props = {
    commonTeams: Team[];
}

export const ConvertGMToChannelForm = ({commonTeams}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const {formatMessage} = useIntl();
    const confirmButtonText = formatMessage({
        id: 'channel_info.convert_gm_to_channel.button_text',
        defaultMessage: 'Convert to Private Channel',
    });

    return (
        <View style={styles.container}>
            <MessageBox/>
            <TeamSelector
                commonTeams={commonTeams}
            />
            <ChannelNameInput/>
            <Button
                onPress={() => true}
                text={confirmButtonText}
                theme={theme}
                buttonType='destructive'
                emphasis='primary'
                size='lg'
            />
        </View>
    );
};
