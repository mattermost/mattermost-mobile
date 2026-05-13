// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {TextStyle} from 'react-native';

export type SyntaxHiglightProps = {
    code: string;
    language: string;
    textStyle: TextStyle;
    selectable?: boolean;
};

export interface SyntaxToken {
    text: string;
    color: string;
    style?: TextStyle;
}

export interface VisualRow {
    id: string;
    logicalLineNumber: number;
    isFirstSegment: boolean;
    tokens: SyntaxToken[];
    rawText: string;
}

export interface ProcessedCode {
    visualRows: VisualRow[];
    maxLineNumberDigits: number;
    totalLogicalLines: number;
}
