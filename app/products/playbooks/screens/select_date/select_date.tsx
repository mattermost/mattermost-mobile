// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Text, View} from 'react-native';

import Button from '@components/button';
import DateTimeSelector from '@components/data_time_selector';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {getDueDateString} from '@playbooks/utils/time';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezone} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    selectedDate?: number;
    currentUserTimezone: UserTimezone | null | undefined;
    onSave: (date: number | undefined) => void;
}

const SAVE_BUTTON_ID = 'save-due-date';

function close (componentId: AvailableScreens) {
    Keyboard.dismiss();
    popTopScreen(componentId);
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        padding: 16,
        gap: 8,
    },
    dateText: {
        ...typography('Body', 300, 'Regular'),
        color: theme.centerChannelColor,
    },
}));

export default function SelectDate({
    componentId,
    selectedDate,
    currentUserTimezone,
    onSave,
}: Props) {
    const [date, setDate] = useState<Moment | undefined>(() => (selectedDate ? moment(selectedDate) : undefined));
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const initialDate = useMemo(() => moment(selectedDate), [selectedDate]);
    const canSave = useMemo(() => {
        if (!date && !selectedDate) {
            return false;
        }

        if ((date && !selectedDate) || (!date && selectedDate)) {
            return true;
        }

        if (!date) {
            return true;
        }

        return !date.isSame(selectedDate);
    }, [date, selectedDate]);

    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SAVE_BUTTON_ID,
            'playbooks.edit_due_date.save.button',
            undefined,
            intl.formatMessage({id: 'playbooks.edit_due_date.save.button', defaultMessage: 'Save'}),
        );
        base.enabled = canSave;
        base.showAsAction = 'always';
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [intl, canSave, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [componentId, rightButton]);

    const handleSave = useCallback(() => {
        if (!canSave) {
            return;
        }
        onSave(date?.valueOf());
        close(componentId);
    }, [canSave, date, onSave, componentId]);

    const handleClear = useCallback(() => {
        setDate(undefined);
    }, []);

    const handleClose = useCallback(() => {
        close(componentId);
    }, [componentId]);

    useNavButtonPressed(SAVE_BUTTON_ID, componentId, handleSave, [handleSave]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    const timezone = getTimezone(currentUserTimezone);

    const dateText = getDueDateString(intl, date?.valueOf(), timezone, true);

    return (
        <View style={styles.container}>
            <Text style={styles.dateText}>{dateText}</Text>
            <Button
                text={intl.formatMessage({id: 'playbooks.edit_due_date.clear.button', defaultMessage: 'Clear'})}
                onPress={handleClear}
                emphasis='link'
                theme={theme}
                size='lg'
            />
            <DateTimeSelector
                handleChange={setDate}
                theme={theme}
                initialDate={initialDate}
                timezone={timezone}
                minuteInterval={5}
            />
        </View>
    );
}
