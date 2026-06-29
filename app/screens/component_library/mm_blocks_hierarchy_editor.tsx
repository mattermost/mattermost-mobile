// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, Switch, Text, TextInput, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {
    ROOT_ADDABLE_TYPES,
    addableTypesForList,
    blockSummary,
    blockTypeLabel,
    canAddChild,
    childListKeyForBlock,
    childPaths,
    createDefaultBlock,
    formatPropertyValue,
    getBlockAt,
    getParentContext,
    getPropertyValue,
    insertBlockAt,
    listLabel,
    pathKey,
    propertyFieldsForBlock,
    removeBlockAt,
    setPropertyValue,
    type BlockPath,
    type BlockTypeId,
    updateBlockAt,
} from './mm_blocks_editor_utils';

type Props = {
    blocks: MmBlock[];
    selectedPath: BlockPath | null;
    onSelectPath: (path: BlockPath | null) => void;
    onChangeBlocks: (blocks: MmBlock[]) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    root: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 8,
        padding: 12,
        gap: 12,
    },
    title: {
        ...typography('Heading', 300),
        color: theme.centerChannelColor,
    },
    sectionTitle: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    hint: {
        ...typography('Body', 100),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    addRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    nodeRow: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 6,
    },
    nodeRowSelected: {
        borderColor: theme.buttonBg,
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
    },
    nodeType: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    nodeSummary: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.74),
        marginTop: 2,
    },
    addTypeButton: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.24),
        borderRadius: 14,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    addTypeButtonText: {
        ...typography('Body', 75),
        color: theme.centerChannelColor,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    actionButtonDanger: {
        borderColor: theme.errorTextColor,
        backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
    },
    actionButtonText: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    actionButtonTextDanger: {
        color: theme.errorTextColor,
    },
    actionButtonDisabled: {
        opacity: 0.5,
    },
    fieldLabel: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 4,
        marginTop: 8,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        color: theme.centerChannelColor,
        ...typography('Body', 100),
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    divider: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
        marginVertical: 8,
    },
}));

const AddTypeButton = ({type, onPress}: {type: BlockTypeId; onPress: (type: BlockTypeId) => void}) => {
    const style = getStyleSheet(useTheme());
    return (
        <Pressable
            onPress={() => onPress(type)}
            style={({pressed}) => [style.addTypeButton, pressed && {opacity: 0.72}]}
        >
            <Text style={style.addTypeButtonText}>{blockTypeLabel(type)}</Text>
        </Pressable>
    );
};

const MmBlocksHierarchyEditor = ({blocks, selectedPath, onSelectPath, onChangeBlocks}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const selected = useMemo(() => (
        selectedPath ? getBlockAt(blocks, selectedPath) : null
    ), [blocks, selectedPath]);

    const onAddRoot = useCallback((type: BlockTypeId) => {
        const next = [...blocks, createBlock(type)];
        onChangeBlocks(next);
        onSelectPath([{list: 'root', index: next.length - 1}]);
    }, [blocks, onChangeBlocks, onSelectPath]);

    const onAddSibling = useCallback((type: BlockTypeId) => {
        if (!selectedPath) {
            return;
        }
        const next = insertBlockAt(blocks, selectedPath, createBlock(type), 'sibling');
        onChangeBlocks(next);
    }, [blocks, onChangeBlocks, selectedPath]);

    const onAddChild = useCallback((type: BlockTypeId) => {
        if (!selectedPath) {
            return;
        }
        const next = insertBlockAt(blocks, selectedPath, createBlock(type), 'child');
        onChangeBlocks(next);
    }, [blocks, onChangeBlocks, selectedPath]);

    const onRemove = useCallback(() => {
        if (!selectedPath) {
            return;
        }
        onChangeBlocks(removeBlockAt(blocks, selectedPath));
        onSelectPath(null);
    }, [blocks, onChangeBlocks, onSelectPath, selectedPath]);

    const moveContext = useMemo(() => {
        if (!selectedPath) {
            return null;
        }
        return getParentContext(blocks, selectedPath);
    }, [blocks, selectedPath]);

    const canMoveUp = Boolean(moveContext && moveContext.index > 0);
    const canMoveDown = Boolean(moveContext && moveContext.index < moveContext.list.length - 1);

    const onMoveByOffset = useCallback((offset: -1 | 1) => {
        if (!selectedPath) {
            return;
        }
        const ctx = getParentContext(blocks, selectedPath);
        if (!ctx) {
            return;
        }
        const targetIndex = ctx.index + offset;
        if (targetIndex < 0 || targetIndex >= ctx.list.length) {
            return;
        }
        const draft = JSON.parse(JSON.stringify(blocks)) as MmBlock[];
        const draftCtx = getParentContext(draft, selectedPath);
        if (!draftCtx) {
            return;
        }
        const [item] = draftCtx.list.splice(draftCtx.index, 1);
        draftCtx.list.splice(targetIndex, 0, item as MmBlock & MmColumnBlock);
        onChangeBlocks(draft);
        const nextPath = [...selectedPath];
        nextPath[nextPath.length - 1] = {
            ...nextPath[nextPath.length - 1],
            index: targetIndex,
        };
        onSelectPath(nextPath);
    }, [blocks, onChangeBlocks, onSelectPath, selectedPath]);

    const onUpdateField = useCallback((key: string, raw: string, field: ReturnType<typeof propertyFieldsForBlock>[number]) => {
        if (!selected || !selectedPath) {
            return;
        }
        const updated = setPropertyValue(selected, key, raw, field);
        onChangeBlocks(updateBlockAt(blocks, selectedPath, updated));
    }, [blocks, onChangeBlocks, selected, selectedPath]);

    const renderNode = useCallback((path: BlockPath, depth: number): React.ReactNode => {
        const block = getBlockAt(blocks, path);
        if (!block) {
            return null;
        }
        const selectedKey = selectedPath ? pathKey(selectedPath) : '';
        const currentKey = pathKey(path);
        const isSelected = selectedKey === currentKey;
        const list = path[path.length - 1]?.list;
        const listText = listLabel(list);

        return (
            <View key={currentKey}>
                {listText && list !== 'root' && (
                    <Text style={[style.hint, {marginLeft: (depth * 12) + 4}]}>
                        {listText}
                    </Text>
                )}
                <Pressable
                    onPress={() => onSelectPath(path)}
                    style={({pressed}) => [
                        style.nodeRow,
                        {marginLeft: depth * 12},
                        isSelected && style.nodeRowSelected,
                        pressed && {opacity: 0.8},
                    ]}
                >
                    <Text style={style.nodeType}>{blockTypeLabel(block.type)}</Text>
                    <Text style={style.nodeSummary}>{blockSummary(block)}</Text>
                </Pressable>
                {childPaths(block, path).map((child) => renderNode(child, depth + 1))}
            </View>
        );
    }, [blocks, onSelectPath, selectedPath, style.hint, style.nodeRow, style.nodeRowSelected, style.nodeSummary, style.nodeType]);

    const childAddableTypes = useMemo(() => {
        if (!selected || !canAddChild(selected)) {
            return [];
        }
        const list = childListKeyForBlock(selected);
        return list ? addableTypesForList(list) : [];
    }, [selected]);

    return (
        <View style={style.root}>
            <Text style={style.title}>{'MM blocks editor'}</Text>
            <Text style={style.sectionTitle}>{'Add root block'}</Text>
            <View style={style.addRow}>
                {ROOT_ADDABLE_TYPES.map((type) => (
                    <AddTypeButton
                        key={`root-${type}`}
                        type={type}
                        onPress={onAddRoot}
                    />
                ))}
            </View>

            <View style={style.divider}/>

            <Text style={style.sectionTitle}>{'Hierarchy'}</Text>
            {blocks.length === 0 ? (
                <Text style={style.hint}>{'No blocks yet. Add one above.'}</Text>
            ) : (
                blocks.map((_, index) => renderNode([{list: 'root', index}], 0))
            )}

            {selected && selectedPath && (
                <>
                    <View style={style.divider}/>
                    <Text style={style.sectionTitle}>{`Selected: ${blockTypeLabel(selected.type)}`}</Text>

                    <View style={style.actionRow}>
                        {ROOT_ADDABLE_TYPES.map((type) => (
                            <AddTypeButton
                                key={`sibling-${type}`}
                                type={type}
                                onPress={onAddSibling}
                            />
                        ))}
                    </View>
                    {childAddableTypes.length > 0 && (
                        <>
                            <Text style={[style.fieldLabel, {marginTop: 10}]}>{'Add child block'}</Text>
                            <View style={style.addRow}>
                                {childAddableTypes.map((type) => (
                                    <AddTypeButton
                                        key={`child-${type}`}
                                        type={type}
                                        onPress={onAddChild}
                                    />
                                ))}
                            </View>
                        </>
                    )}
                    <View style={style.actionRow}>
                        <Pressable
                            onPress={() => onMoveByOffset(-1)}
                            disabled={!canMoveUp}
                            style={({pressed}) => [
                                style.actionButton,
                                !canMoveUp && style.actionButtonDisabled,
                                pressed && canMoveUp && {opacity: 0.72},
                            ]}
                        >
                            <Text style={style.actionButtonText}>{'Move up'}</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onMoveByOffset(1)}
                            disabled={!canMoveDown}
                            style={({pressed}) => [
                                style.actionButton,
                                !canMoveDown && style.actionButtonDisabled,
                                pressed && canMoveDown && {opacity: 0.72},
                            ]}
                        >
                            <Text style={style.actionButtonText}>{'Move down'}</Text>
                        </Pressable>
                        <Pressable
                            onPress={onRemove}
                            style={({pressed}) => [
                                style.actionButton,
                                style.actionButtonDanger,
                                pressed && {opacity: 0.72},
                            ]}
                        >
                            <Text style={[style.actionButtonText, style.actionButtonTextDanger]}>{'Remove block'}</Text>
                        </Pressable>
                    </View>

                    {propertyFieldsForBlock(selected).length > 0 && (
                        <>
                            <Text style={[style.sectionTitle, {marginTop: 12}]}>{'Properties'}</Text>
                            {propertyFieldsForBlock(selected).map((field) => {
                                const value = getPropertyValue(selected, field.key);
                                const display = formatPropertyValue(value, field);

                                if (field.type === 'boolean') {
                                    return (
                                        <View
                                            key={field.key}
                                            style={style.rowBetween}
                                        >
                                            <Text style={style.fieldLabel}>{field.label}</Text>
                                            <Switch
                                                value={value === true}
                                                onValueChange={(enabled) => onUpdateField(field.key, enabled ? 'true' : '', field)}
                                            />
                                        </View>
                                    );
                                }

                                if (field.type === 'enum' && field.options) {
                                    return (
                                        <View key={field.key}>
                                            <Text style={style.fieldLabel}>{field.label}</Text>
                                            <View style={style.addRow}>
                                                <Pressable
                                                    onPress={() => onUpdateField(field.key, '', field)}
                                                    style={({pressed}) => [style.addTypeButton, pressed && {opacity: 0.72}]}
                                                >
                                                    <Text style={style.addTypeButtonText}>{'(unset)'}</Text>
                                                </Pressable>
                                                {field.options.map((opt) => (
                                                    <Pressable
                                                        key={`${field.key}-${opt}`}
                                                        onPress={() => onUpdateField(field.key, opt, field)}
                                                        style={({pressed}) => [
                                                            style.addTypeButton,
                                                            display === opt && {borderColor: theme.buttonBg, backgroundColor: changeOpacity(theme.buttonBg, 0.08)},
                                                            pressed && {opacity: 0.72},
                                                        ]}
                                                    >
                                                        <Text style={style.addTypeButtonText}>{opt}</Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                }

                                return (
                                    <View key={field.key}>
                                        <Text style={style.fieldLabel}>{field.label}</Text>
                                        <TextInput
                                            style={style.fieldInput}
                                            placeholder={field.placeholder}
                                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                                            multiline={field.type === 'json' || field.key === 'text'}
                                            value={display}
                                            onChangeText={(nextValue) => onUpdateField(field.key, nextValue, field)}
                                        />
                                    </View>
                                );
                            })}
                        </>
                    )}
                </>
            )}
        </View>
    );
};

function createBlock(type: BlockTypeId): MmBlock {
    return createDefaultBlock(type);
}

export default MmBlocksHierarchyEditor;
