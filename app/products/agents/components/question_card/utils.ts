// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {safeParseJSON} from '@utils/helpers';

/**
 * Parsed shape of the AskUserQuestion tool arguments. Mirrors
 * mmtools.AskUserQuestionArgs on the server.
 */
export interface QuestionOption {
    label: string;
    description?: string;
}

export interface QuestionArgs {
    question: string;
    options: QuestionOption[];
    multiSelect: boolean;
    allowFreeForm: boolean;
}

/**
 * Extracts a renderable question from tool call arguments. Returns null when
 * the arguments are missing or malformed (e.g. redacted for non-requesters)
 * so the caller can fall back to the generic tool card. Tolerates
 * string-encoded JSON arguments.
 */
export function parseQuestionArgs(args: unknown): QuestionArgs | null {
    const parsed = typeof args === 'string' ? safeParseJSON(args) : args;
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }
    const obj = parsed as {[key: string]: unknown};
    const question = obj.question;
    const options = obj.options;
    if (typeof question !== 'string' || question === '' || !Array.isArray(options) || options.length === 0) {
        return null;
    }
    const parsedOptions: QuestionOption[] = [];
    for (const opt of options) {
        if (opt == null || typeof opt !== 'object' || Array.isArray(opt)) {
            return null;
        }
        const optObj = opt as {[key: string]: unknown};
        if (typeof optObj.label !== 'string' || optObj.label === '') {
            return null;
        }
        parsedOptions.push({
            label: optObj.label,
            description: typeof optObj.description === 'string' ? optObj.description : undefined,
        });
    }
    return {
        question,
        options: parsedOptions,
        multiSelect: obj.multi_select === true,

        // Mirror the server pointer semantics (mmtools.AskUserQuestionArgs):
        // an absent key means enabled, an explicit false disables.
        allowFreeForm: obj.allow_free_form !== false,
    };
}

/**
 * Extracts the selected option labels and any free-form text from the tool
 * result content ({"selected": [...], "custom": "..."} — see
 * mmtools.AskUserQuestionResult).
 */
export function parseAnswerFromResult(result?: string): {selected: string[]; custom: string} {
    if (!result) {
        return {selected: [], custom: ''};
    }
    const parsed = safeParseJSON(result);
    if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
        return {selected: [], custom: ''};
    }
    const obj = parsed as {[key: string]: unknown};
    const selected = Array.isArray(obj.selected) ? obj.selected.filter((s: unknown): s is string => typeof s === 'string') : [];
    const custom = typeof obj.custom === 'string' ? obj.custom : '';
    return {selected, custom};
}
