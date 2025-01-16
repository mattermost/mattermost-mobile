// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import PickerOption from '@screens/post_priority_picker/components/picker_option';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import moment from "moment";
import {getUserTimezoneProps} from "@utils/user";
import DatabaseManager from "@database/manager";
import {getCurrentUser} from "@queries/servers/user";
import {withServerUrl} from "@context/server";

const OPTIONS_PADDING = 12;
const OPTIONS_SEPARATOR_HEIGHT = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        height: 200,
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
    optionsSeparator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: OPTIONS_SEPARATOR_HEIGHT,
    },
}));

type Props = {
    serverUrl: string;
}

function ScheduledPostOptions({serverUrl}: Props) {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const intl = useIntl();
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const currentUser = await getCurrentUser(database);

    const optionMonday = (
        <PickerOption
            label={intl.formatMessage({id: 'scheduled_post.picker.monday', defaultMessage: 'Monday at 9 AM'})}
        />
    );

    const optionTomorrow = (
        <PickerOption
            label={intl.formatMessage({id: 'scheduled_post.picker.tomorrow', defaultMessage: 'Tomorrow at 9 AM'})}
        />
    );

    const nextMonday = (
        <PickerOption
            label={intl.formatMessage({id: 'scheduled_post.picker.monday', defaultMessage: 'Next Monday at 9 AM'})}
        />
    );

    const userTimezone = getUserTimezoneProps(currentUser);
    const timezone = userTimezone.useAutomaticTimezone ? userTimezone.automaticTimezone : userTimezone.manualTimezone;

    const now = moment().tz()



    const style = getStyleSheet(theme);

    const renderContent = () => {
        return (
            <View style={style.container}>
                {
                    !isTablet &&
                    <View style={style.titleContainer}>
                        <FormattedText
                            id='scheduled_post.picker.title'
                            defaultMessage='Schedule draft'
                            style={style.title}
                        />
                    </View>
                }
                <View style={style.optionsContainer}>
                    <PickerOption
                        label={'Tomorrow at 9:00 AM'}
                    />
                    <PickerOption
                        label={'Monday at 9:00 AM'}
                    />
                    <View style={style.optionsSeparator}/>
                    <PickerOption
                        label={'Custom Time'}
                    />
                </View>
            </View>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            componentId={Screens.SCHEDULED_POST_OPTIONS}
        />
    );
}

export default withServerUrl(ScheduledPostOptions);
