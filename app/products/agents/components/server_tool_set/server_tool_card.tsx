// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl, type IntlShape} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import {ServerToolName, ServerToolStatus, type ServerToolUse} from '@agents/types';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {getCodeFont} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUrlDomain} from '@utils/url';

const messages = defineMessages({
    searchedFor: {id: 'agents.server_tool.searched_for', defaultMessage: 'Searched the web for "{query}"'},
    searched: {id: 'agents.server_tool.searched', defaultMessage: 'Searched the web'},
    fetchedHost: {id: 'agents.server_tool.fetched_host', defaultMessage: 'Fetched {host}'},
    fetched: {id: 'agents.server_tool.fetched', defaultMessage: 'Fetched a web page'},
    editedFiles: {id: 'agents.server_tool.edited_files', defaultMessage: 'Edited files in the provider sandbox'},
    ranCode: {id: 'agents.server_tool.ran_code', defaultMessage: 'Ran code in the provider sandbox'},
    usedTool: {id: 'agents.server_tool.used_tool', defaultMessage: 'Used a provider tool'},
    url: {id: 'agents.server_tool.detail.url', defaultMessage: 'URL'},
    title: {id: 'agents.server_tool.detail.title', defaultMessage: 'Title'},
    input: {id: 'agents.server_tool.detail.input', defaultMessage: 'Input'},
    output: {id: 'agents.server_tool.detail.output', defaultMessage: 'Output'},
    error: {id: 'agents.server_tool.detail.error', defaultMessage: 'Error'},
});

const HIT_SLOP = {top: 8, bottom: 8};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    chevron: {
        width: 16,
    },
    title: {
        flex: 1,
        color: changeOpacity(theme.centerChannelColor, 0.75),
        ...typography('Body', 75),
    },
    detail: {
        marginLeft: 24,
        paddingVertical: 4,
    },
    detailLabel: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        textTransform: 'uppercase',
        ...typography('Body', 25, 'SemiBold'),
    },
    detailContent: {
        marginTop: 2,
        padding: 8,
        borderRadius: 4,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        color: theme.centerChannelColor,
        fontFamily: getCodeFont(),
        ...typography('Body', 50),
    },
}));

const TOOL_ICONS: Record<string, CompassIconName> = {
    [ServerToolName.WebSearch]: 'magnify',
    [ServerToolName.WebFetch]: 'link-variant',
};

function getTitle(tool: ServerToolUse, intl: IntlShape): string {
    switch (tool.tool) {
        case ServerToolName.WebSearch:
            return tool.query ? intl.formatMessage(messages.searchedFor, {query: tool.query}) : intl.formatMessage(messages.searched);
        case ServerToolName.WebFetch:
            return tool.url ? intl.formatMessage(messages.fetchedHost, {host: getUrlDomain(tool.url)}) : intl.formatMessage(messages.fetched);
        case ServerToolName.CodeInterpreter:
            return intl.formatMessage(tool.sub_tool === 'text_editor' ? messages.editedFiles : messages.ranCode);
        default:
            return intl.formatMessage(messages.usedTool);
    }
}

// The bash prompt glyph is a shell symbol, not language, so it stays literal.
function getDetails(tool: ServerToolUse, intl: IntlShape) {
    const details: Array<{label: string; content: string}> = [];
    if (tool.tool === ServerToolName.WebFetch && tool.url) {
        details.push({label: intl.formatMessage(messages.url), content: tool.url});
    }
    if (tool.title) {
        details.push({label: intl.formatMessage(messages.title), content: tool.title});
    }
    if (tool.command) {
        details.push({label: tool.sub_tool === 'bash' ? '$' : intl.formatMessage(messages.input), content: tool.command});
    }
    if (tool.output) {
        details.push({label: intl.formatMessage(messages.output), content: tool.output});
    }
    if (tool.error_code) {
        details.push({label: intl.formatMessage(messages.error), content: tool.error_code});
    }
    return details;
}

type Props = {
    tool: ServerToolUse;
};

/**
 * One provider-executed tool invocation (web search, page fetch or sandbox
 * code run). Informational only; details expand on tap when present.
 */
const ServerToolCard = ({tool}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [expanded, setExpanded] = useState(false);

    const details = getDetails(tool, intl);
    const canExpand = details.length > 0;
    const toggle = useCallback(() => setExpanded((prev) => !prev), []);
    const testID = `agents.server_tool.${tool.id}`;

    let status = (
        <CompassIcon
            name='check'
            size={12}
            color={theme.onlineIndicator}
        />
    );
    if (tool.status === ServerToolStatus.InProgress) {
        status = (
            <Loading
                size='small'
                color={changeOpacity(theme.centerChannelColor, 0.64)}
            />
        );
    } else if (tool.status === ServerToolStatus.Error) {
        status = (
            <CompassIcon
                name='alert-circle-outline'
                size={12}
                color={theme.errorTextColor}
            />
        );
    }

    return (
        <View testID={testID}>
            <Pressable
                onPress={canExpand ? toggle : undefined}
                disabled={!canExpand}
                hitSlop={HIT_SLOP}
                style={({pressed}) => [styles.header, pressed && {opacity: 0.72}]}
                testID={`${testID}.header`}
            >
                <View style={styles.chevron}>
                    {canExpand && (
                        <CompassIcon
                            name={expanded ? 'chevron-down' : 'chevron-right'}
                            size={16}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                        />
                    )}
                </View>
                <CompassIcon
                    name={TOOL_ICONS[tool.tool] ?? 'code-tags'}
                    size={14}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
                <Text
                    style={styles.title}
                    numberOfLines={1}
                >
                    {getTitle(tool, intl)}
                </Text>
                {status}
            </Pressable>
            {expanded && details.map((detail) => (
                <View
                    key={detail.label}
                    style={styles.detail}
                >
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text
                        style={styles.detailContent}
                        selectable={true}
                    >
                        {detail.content}
                    </Text>
                </View>
            ))}
        </View>
    );
};

export default ServerToolCard;
