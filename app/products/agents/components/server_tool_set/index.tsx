// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import ServerToolCard from './server_tool_card';

import type {ServerToolUse} from '@agents/types';

const styles = StyleSheet.create({
    container: {
        gap: 2,
        marginVertical: 4,
    },
});

type Props = {
    serverTools: ServerToolUse[];
};

/**
 * Provider-executed tool activity for one response round (e.g. Anthropic or
 * OpenAI native web search and code execution). Webapp ServerToolSet parity.
 */
const ServerToolSet = ({serverTools}: Props) => (
    <View
        style={styles.container}
        testID='agents.server_tool_set'
    >
        {serverTools.map((tool) => (
            <ServerToolCard
                key={tool.id}
                tool={tool}
            />
        ))}
    </View>
);

export default ServerToolSet;
