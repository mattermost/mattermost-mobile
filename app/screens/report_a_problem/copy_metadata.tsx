// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, StyleSheet} from 'react-native';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {metadataToString, reportAProblemMessages} from '@utils/share_logs';

import {getCommonStyleSheet} from './styles';

import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

type Props = {
    metadata: ReportAProblemMetadata;
}

const styles = StyleSheet.create({
    buttonContainer: {
        alignItems: 'flex-start',
    },
    container: {
        gap: 16,
    },
});

const CopyMetadata = ({metadata}: Props) => {
    const theme = useTheme();
    const commonStyles = getCommonStyleSheet(theme);
    const intl = useIntl();

    const handleCopy = useCallback(() => {
        Clipboard.setString(metadataToString(metadata));
    }, [metadata]);

    return (
        <View style={styles.container}>
            <Text style={commonStyles.sectionTitle}>
                {intl.formatMessage({
                    id: 'screen.report_problem.metadata.title',
                    defaultMessage: 'METADATA:',
                })}
            </Text>
            <View>
                {Object.entries(metadata).map(([key, value]) => (
                    <Text
                        key={key}
                        style={commonStyles.bodyText}
                        numberOfLines={1}
                    >
                        {`${intl.formatMessage(reportAProblemMessages[key as keyof Props['metadata']])}: ${value}`}
                    </Text>
                ))}
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    onPress={handleCopy}
                    emphasis='tertiary'
                    iconName='content-copy'
                    iconSize={20}
                    theme={theme}
                    text={intl.formatMessage({id: 'report_a_problem.metadata.copy', defaultMessage: 'Copy'})}
                />
            </View>
        </View>
    );
};

export default CopyMetadata;
