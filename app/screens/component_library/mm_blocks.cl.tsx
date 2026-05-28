// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Switch, Text, View} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import {BlockRenderer} from '@components/block_renderer';
import {translateAdaptiveCards} from '@components/block_renderer/translation/adaptive_cards';
import {translateAttachments} from '@components/block_renderer/translation/attachments';
import {translateBlockKit} from '@components/block_renderer/translation/block_kit';
import {translateMMBlocks} from '@components/block_renderer/translation/mm_block';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {serializeMmBlocks, type BlockPath} from './mm_blocks_editor_utils';
import MmBlocksHierarchyEditor from './mm_blocks_hierarchy_editor';

type InputMode = 'mm_blocks' | 'attachments' | 'block_kit' | 'adaptive_cards';

const INPUT_MODE_OPTIONS: Array<{id: InputMode; label: string}> = [
    {id: 'mm_blocks', label: 'MM blocks (canonical mm_blocks)'},
    {id: 'attachments', label: 'Attachments (props.attachments)'},
    {id: 'block_kit', label: 'Block Kit (props.blocks)'},
    {id: 'adaptive_cards', label: 'Adaptive Cards (props.cards)'},
];

const INITIAL_DRAFTS: Record<InputMode, string> = {
    mm_blocks: `[
  {
    "type": "text",
    "text": "Hello **from** mm blocks"
  },
  {
    "type": "button",
    "text": "Sample action",
    "style": "primary",
    "action_id": "component_library_demo"
  }
]`,
    attachments: `[
  {
    "color": "#36a64f",
    "pretext": "Optional pretext",
    "title": "Attachment title",
    "title_link": "https://example.com",
    "text": "Body *markdown* text"
  }
]`,
    block_kit: `[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*Hello* from Block Kit"
    }
  },
  {
    "type": "divider"
  },
  {
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": { "type": "plain_text", "text": "OK" },
        "action_id": "block_kit_demo"
      }
    ]
  }
]`,
    adaptive_cards: `[
  {
    "type": "AdaptiveCard",
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "Hello from an Adaptive Card",
        "wrap": true
      }
    ]
  }
]`,
};

const COMPONENT_LIBRARY_POST_ID = 'component_library_mm_blocks';
const COMPONENT_LIBRARY_CHANNEL_ID = 'component_library_channel';
const SLOW_ACTION_DELAY_MS = 5000;

type ParseResult = {ok: true; blocks: MmBlock[]} | {ok: false; error: string};

function tryParseJson(text: string): {ok: true; value: unknown} | {ok: false; error: string} {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return {ok: false, error: 'Enter JSON for the selected format.'};
    }
    try {
        return {ok: true, value: JSON.parse(trimmed)};
    } catch (e) {
        return {ok: false, error: e instanceof Error ? e.message : 'Invalid JSON.'};
    }
}

function normalizeAdaptiveCardsPayload(parsed: unknown): unknown[] | null {
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (typeof parsed === 'object' && parsed !== null && (parsed as Record<string, unknown>).type === 'AdaptiveCard') {
        return [parsed];
    }
    return null;
}

function parsePayload(text: string, mode: InputMode): ParseResult {
    const json = tryParseJson(text);
    if (!json.ok) {
        return json;
    }
    const parsed = json.value;

    if (mode === 'mm_blocks') {
        if (!Array.isArray(parsed)) {
            return {ok: false, error: 'Top-level JSON value must be an array of mm blocks.'};
        }
        return {ok: true, blocks: translateMMBlocks(parsed)};
    }

    if (mode === 'attachments') {
        if (!Array.isArray(parsed)) {
            return {ok: false, error: 'Expected a JSON array of attachment objects (same as props.attachments).'};
        }
        return {ok: true, blocks: translateAttachments(parsed)};
    }

    if (mode === 'block_kit') {
        if (!Array.isArray(parsed)) {
            return {ok: false, error: 'Expected a JSON array of Block Kit blocks (same as props.blocks).'};
        }
        return {ok: true, blocks: translateBlockKit(parsed)};
    }

    const cards = normalizeAdaptiveCardsPayload(parsed);
    if (cards === null) {
        return {
            ok: false,
            error: 'Expected a JSON array of Adaptive Card objects, or one object with type "AdaptiveCard" (same as props.cards).',
        };
    }
    return {ok: true, blocks: translateAdaptiveCards(cards)};
}

const modeOptions = INPUT_MODE_OPTIONS.map((opt) => ({
    value: opt.id,
    text: opt.label,
}));

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    root: {
        padding: 8,
    },
    text: {
        marginVertical: 8,
        ...typography('Body', 100),
    },
    errorText: {
        color: theme.errorTextColor,
    },
    hintText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    toggleRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    toggleLabel: {
        ...typography('Body', 100),
        color: theme.centerChannelColor,
        flexShrink: 1,
    },
}));

const MmBlocksComponentLibrary = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [inputMode, setInputMode] = useState<InputMode>('mm_blocks');
    const [drafts, setDrafts] = useState<Record<InputMode, string>>(() => ({...INITIAL_DRAFTS}));
    const [selectedBlockPath, setSelectedBlockPath] = useState<BlockPath | null>(null);
    const [simulateSlowAction, setSimulateSlowAction] = useState(false);

    const jsonText = drafts[inputMode];
    const parsed = useMemo(() => parsePayload(jsonText, inputMode), [jsonText, inputMode]);

    const onSelectMode = useCallback((value: SelectedDialogOption) => {
        if (!value || Array.isArray(value)) {
            return;
        }
        setInputMode(value.value as InputMode);
        setSelectedBlockPath(null);
    }, []);

    const onChangeJson = useCallback((value: string) => {
        setDrafts((d) => ({...d, [inputMode]: value}));
        if (inputMode === 'mm_blocks') {
            setSelectedBlockPath(null);
        }
    }, [inputMode]);

    const onHierarchyBlocksChange = useCallback((blocks: MmBlock[]) => {
        setDrafts((d) => ({...d, mm_blocks: serializeMmBlocks(blocks)}));
    }, []);

    const onAction = useCallback(async (actionId: string, selectedOption?: string, query?: Record<string, string>, attachmentCookie?: string) => {
        if (simulateSlowAction) {
            await new Promise<void>((resolve) => {
                setTimeout(resolve, SLOW_ACTION_DELAY_MS);
            });
        }
        const parts = [
            `action_id: ${actionId}`,
            selectedOption !== undefined && selectedOption !== '' ? `value: ${selectedOption}` : null,
            attachmentCookie !== undefined && attachmentCookie !== '' ? `cookie: ${attachmentCookie.slice(0, 48)}...` : null,
            query && Object.keys(query).length > 0 ? `query: ${JSON.stringify(query)}` : null,
        ].filter(Boolean);
        Alert.alert('MM blocks action', parts.join('\n'));
    }, [simulateSlowAction]);

    const emptyTranslation =
        parsed.ok &&
        parsed.blocks.length === 0 &&
        inputMode !== 'mm_blocks';
    const showMmBlocksEditor = inputMode === 'mm_blocks' && parsed.ok;

    return (
        <View style={style.root}>
            <AutocompleteSelector
                testID='mm_blocks.input_mode'
                label='Payload format'
                onSelected={onSelectMode}
                selected={inputMode}
                options={modeOptions}
                location={Screens.COMPONENT_LIBRARY}
            />
            <TextSetting
                label='JSON'
                multiline={true}
                disabled={false}
                keyboardType='default'
                onChange={onChangeJson}
                optional={false}
                secureTextEntry={false}
                testID='mm_blocks.json'
                value={jsonText}
                location={Screens.COMPONENT_LIBRARY}
            />
            {showMmBlocksEditor && (
                <MmBlocksHierarchyEditor
                    blocks={parsed.blocks}
                    selectedPath={selectedBlockPath}
                    onSelectPath={setSelectedBlockPath}
                    onChangeBlocks={onHierarchyBlocksChange}
                />
            )}
            {!parsed.ok && (
                <Text
                    style={[style.text, style.errorText]}
                    accessibilityRole='alert'
                >
                    {parsed.error}
                </Text>
            )}
            {emptyTranslation && (
                <Text
                    style={[style.text, style.hintText]}
                >
                    {'Translation produced no blocks. Check that the JSON matches the selected format and contains supported elements.'}
                </Text>
            )}
            <View style={style.toggleRow}>
                <Text style={style.toggleLabel}>{`Simulate slow action (${SLOW_ACTION_DELAY_MS / 1000}s delay)`}</Text>
                <Switch
                    value={simulateSlowAction}
                    onValueChange={setSimulateSlowAction}
                />
            </View>
            {parsed.ok && parsed.blocks.length > 0 && (
                <BlockRenderer
                    blocks={parsed.blocks}
                    channelId={COMPONENT_LIBRARY_CHANNEL_ID}
                    location={Screens.COMPONENT_LIBRARY}
                    onAction={onAction}
                    postId={COMPONENT_LIBRARY_POST_ID}
                    theme={theme}
                />
            )}
        </View>
    );
};

export default MmBlocksComponentLibrary;
