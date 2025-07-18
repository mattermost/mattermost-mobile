// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import Button from '@components/button';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {fetchFinishedRunsForChannel} from '@playbooks/actions/remote/runs';

type Props = {
    channelId: string;
    addMoreRuns: (runs: PlaybookRun[]) => void;
    visible: boolean;
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 16,
    },
});

const ShowMoreButton = ({
    channelId,
    addMoreRuns,
    visible,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [fetching, setFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const page = useRef(0);

    const fetchFinishedRuns = usePreventDoubleTap(useCallback(async () => {
        if (fetching) {
            return;
        }
        setFetching(true);
        const {runs, has_more, error} = await fetchFinishedRunsForChannel(serverUrl, channelId, page.current);
        setFetching(false);
        if (error) {
            setHasMore(false);
            return;
        }
        setHasMore(has_more ?? false);
        page.current++;
        if (runs?.length) {
            addMoreRuns(runs);
        }
    }, [channelId, fetching, serverUrl, addMoreRuns]));

    if (!hasMore || !visible) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Button
                text={intl.formatMessage({id: 'playbooks.runs.show_more', defaultMessage: 'Show More'})}
                emphasis='tertiary'
                onPress={fetchFinishedRuns}
                theme={theme}
                showLoader={fetching}
            />
        </View>
    );
};

export default ShowMoreButton;
