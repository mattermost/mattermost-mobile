// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import {handleGotoLocation} from '@actions/remote/command';
import {doBlockAction, executeDialogAction, lookupInteractiveDialog, submitInteractiveDialog} from '@actions/remote/integrations';
import {BlockRenderer, type ActionHandler, type ActionHandlerParams, type LookupHandler} from '@components/block_renderer';
import {formValuesToDialogSubmission, MmBlocksForm, useMmBlocksForm, type MmBlocksFormErrors, type MmBlocksFormValues} from '@components/block_renderer/form';
import {stripMmBlocksFormInputs, validateMmBlocksFormValues} from '@components/block_renderer/form_validation';
import {translateMMBlocks} from '@components/block_renderer/translation/mm_block';
import Button from '@components/button';
import SectionNotice from '@components/section_notice';
import {Screens} from '@constants';
import {MAX_DIALOG_FILE_IDS} from '@constants/integrations';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import IntegrationsManager from '@managers/integrations_manager';
import {observeBlockActionsEnabled} from '@queries/servers/features';
import {dismissMmBlocksExpandedContentIfOpen, navigateBack} from '@screens/navigation';
import {convertDialogToMmBlocks, dialogShouldShowSubmitChrome, DIALOG_SUBMIT_ACTION_ID} from '@utils/dialog_to_mm_blocks';
import {formatDialogFieldError} from '@utils/integrations';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';

const messages = defineMessages({
    cancel: {id: 'interactive_dialog.cancel', defaultMessage: 'Cancel'},
    submit: {id: 'interactive_dialog.submit', defaultMessage: 'Submit'},
    errorTitle: {id: 'interactive_dialog.error_title', defaultMessage: 'Error'},
    actionFailed: {id: 'interactive_dialog.action_failed', defaultMessage: 'Action failed to execute'},
    submitFailed: {id: 'interactive_dialog.submit_failed', defaultMessage: 'Submission failed'},
    refreshFailed: {id: 'interactive_dialog.refresh_failed', defaultMessage: 'Failed to refresh form fields'},
    fixFieldErrors: {id: 'apps.error.form.required_fields_empty', defaultMessage: 'Please fix all field errors'},
    filesUploading: {id: 'interactive_dialog.files_uploading', defaultMessage: 'Please wait for file uploads to finish'},
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        height: '100%',
        backgroundColor: theme.centerChannelBg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    actionError: {
        marginTop: 12,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        padding: 16,
        gap: 8,
    },
}));

/** Legacy Interactive Dialog `file` elements ship their IDs alongside the string submission. */
function collectDialogFileIds(submission: Record<string, string>, dialogElements: DialogElement[] | undefined): string[] {
    const fileIds: string[] = [];
    dialogElements?.forEach((element) => {
        if (element.type !== 'file' || !submission[element.name]) {
            return;
        }
        fileIds.push(...submission[element.name].split(',').filter(Boolean));
    });
    return fileIds.slice(0, MAX_DIALOG_FILE_IDS);
}

/** Legacy Interactive Dialog lookups only proxy to trusted server-controlled URLs. */
function isValidLookupURL(url: string): boolean {
    if (!url) {
        return false;
    }
    if (url.startsWith('https://')) {
        return true;
    }
    if (url.startsWith('http://')) {
        try {
            const hostname = new URL(url).hostname;
            return hostname === 'localhost' || hostname === '127.0.0.1';
        } catch {
            return false;
        }
    }
    if (url.startsWith('/plugins/')) {
        return !url.includes('..') && !url.includes('//');
    }
    return false;
}

export type BlocksDialogShellMode = 'legacy' | 'native';

export type BlocksDialogShellProps = {
    mode: BlocksDialogShellMode;

    /**
     * When false (block actions unavailable), native form input blocks are omitted.
     * Legacy dialog elements are unaffected — they use the older dialog APIs.
     */
    blockActionsEnabled: boolean;

    // Shared chrome (from Dialog or BlockDialog)
    title?: string;
    notifyOnCancel?: boolean;
    state?: string;
    channelId?: string;

    // Legacy Interactive Dialog
    url?: string;
    callbackId?: string;
    elements?: DialogElement[];
    introductionText?: string;
    submitLabel?: string;
    sourceUrl?: string;

    // Native block_dialog
    mmBlocks?: Array<Record<string, unknown>>;
    mmBlocksActions?: string;
    blockSubmit?: BlockDialogButton;
    blockCancel?: BlockDialogButton;
};

type NativeFooterProps = {
    blockSubmit?: BlockDialogButton;
    blockCancel?: BlockDialogButton;
    onSubmit: (formValues: MmBlocksFormValues) => void;
    onCancel: () => void;
    busy: boolean;
    submitDisabled: boolean;
    theme: Theme;
};

/** Stable empty cancel chrome for legacy footers (avoids a new {} each render). */
const LEGACY_BLOCK_CANCEL: BlockDialogButton = {};

function NativeDialogFooter({blockSubmit, blockCancel, onSubmit, onCancel, busy, submitDisabled, theme}: NativeFooterProps) {
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const {values} = useMmBlocksForm();

    const handleSubmitPress = useCallback(() => {
        onSubmit(values);
    }, [onSubmit, values]);

    if (!blockSubmit && !blockCancel) {
        return null;
    }

    return (
        <View style={style.footer}>
            {blockSubmit && (
                <Button
                    theme={theme}
                    size='lg'
                    text={blockSubmit.label || intl.formatMessage(messages.submit)}
                    onPress={handleSubmitPress}
                    disabled={busy || submitDisabled}
                    showLoader={busy}
                    testID='interactive_dialog.submit.button'
                />
            )}
            {blockCancel && (
                <Button
                    theme={theme}
                    size='lg'
                    emphasis='tertiary'
                    text={blockCancel.label || intl.formatMessage(messages.cancel)}
                    onPress={onCancel}
                    disabled={busy}
                    testID='interactive_dialog.cancel.button'
                />
            )}
        </View>
    );
}

export const BlocksDialogShell = ({
    mode,
    blockActionsEnabled,
    title: initialTitle,
    notifyOnCancel: initialNotifyOnCancel,
    state: dialogState,
    channelId,
    url,
    callbackId,
    elements: initialElements,
    introductionText: initialIntroductionText,
    submitLabel: initialSubmitLabel,
    sourceUrl,
    mmBlocks: initialMmBlocks,
    mmBlocksActions: initialCookie,
    blockSubmit: initialBlockSubmit,
    blockCancel: initialBlockCancel,
}: BlocksDialogShellProps) => {
    const intl = useIntl();
    const navigation = useNavigation();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const [title, setTitle] = useState(initialTitle);
    const [notifyOnCancel, setNotifyOnCancel] = useState(initialNotifyOnCancel);
    const [elements, setElements] = useState(initialElements);
    const [introductionText, setIntroductionText] = useState(initialIntroductionText);
    const [submitLabel, setSubmitLabel] = useState(initialSubmitLabel);
    const [dialogStateValue, setDialogStateValue] = useState(dialogState);
    const [sourceUrlValue, setSourceUrlValue] = useState(sourceUrl);
    const [blockSubmit, setBlockSubmit] = useState(initialBlockSubmit);
    const [blockCancel, setBlockCancel] = useState(initialBlockCancel);
    const [blocksOverride, setBlocksOverride] = useState<MmBlock[] | null>(null);
    const [cookieOverride, setCookieOverride] = useState<string | undefined>(undefined);
    const [actionError, setActionError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<MmBlocksFormErrors>({});
    const [busy, setBusy] = useState(false);
    const [hasUploadingFields, setHasUploadingFields] = useState(false);
    const refreshRequestIdRef = useRef(0);

    // Remount counter for BlockRenderer/MmBlocksForm. Form values live in component state, so a
    // blocks refresh must remount (via key) to clear stale values and re-seed defaults.
    const [blocksEpoch, setBlocksEpoch] = useState(0);

    useEffect(() => {
        navigation.setOptions({headerTitle: title});
    }, [navigation, title]);

    useEffect(() => {
        setElements(initialElements);
        setIntroductionText(initialIntroductionText);
        setSubmitLabel(initialSubmitLabel);
        setDialogStateValue(dialogState);
        setSourceUrlValue(sourceUrl);
    }, [initialElements, initialIntroductionText, initialSubmitLabel, dialogState, sourceUrl]);

    useEffect(() => {
        setTitle(initialTitle);
        setNotifyOnCancel(initialNotifyOnCancel);
        setBlockSubmit(initialBlockSubmit);
        setBlockCancel(initialBlockCancel);
        setBlocksOverride(null);
        setCookieOverride(undefined);
        setBlocksEpoch(0);
        setActionError(null);
        setFieldErrors({});
        refreshRequestIdRef.current = 0;
    }, [initialMmBlocks, initialCookie, initialTitle, initialNotifyOnCancel, initialBlockSubmit, initialBlockCancel]);

    const effectiveCookie = cookieOverride ?? (typeof initialCookie === 'string' ? initialCookie : undefined);

    const blocks = useMemo((): MmBlock[] => {
        let raw: MmBlock[];
        if (blocksOverride) {
            raw = blocksOverride;
        } else if (mode === 'native') {
            raw = translateMMBlocks(initialMmBlocks || []);
        } else {
            // Legacy dialog elements keep working on older servers via dialog APIs.
            return convertDialogToMmBlocks(elements, introductionText).blocks;
        }

        if (mode === 'native' && !blockActionsEnabled) {
            return stripMmBlocksFormInputs(raw);
        }
        return raw;
    }, [blockActionsEnabled, blocksOverride, mode, initialMmBlocks, elements, introductionText]);

    useEffect(() => {
        if (blocks.length === 0) {
            logDebug('[BlocksDialogShell] no blocks to render', {
                mode,
                elementCount: elements?.length ?? 0,
                mmBlockCount: initialMmBlocks?.length ?? 0,
            });
        }
    }, [blocks.length, elements?.length, initialMmBlocks?.length, mode]);

    const applyLegacyFormResponse = useCallback(async (form: Dialog) => {
        await dismissMmBlocksExpandedContentIfOpen();
        setElements(form.elements);
        setIntroductionText(form.introduction_text);
        setSubmitLabel(form.submit_label);
        setDialogStateValue(form.state);
        setSourceUrlValue(form.source_url);
        setTitle(form.title);
        setNotifyOnCancel(form.notify_on_cancel);
        setBlocksOverride(null);
        setBlocksEpoch((epoch) => epoch + 1);
        setActionError(null);
        setFieldErrors({});
    }, []);

    const applyBlockDialogResponse = useCallback(async (dialog: BlockDialog) => {
        await dismissMmBlocksExpandedContentIfOpen();
        setTitle(dialog.title);
        setNotifyOnCancel(dialog.notify_on_cancel);
        setDialogStateValue(dialog.state);
        setBlockSubmit(dialog.submit);
        setBlockCancel(dialog.cancel);
        setBlocksOverride(translateMMBlocks(dialog.blocks || []));
        if (typeof dialog.actions === 'string') {
            setCookieOverride(dialog.actions);
        }
        setBlocksEpoch((epoch) => epoch + 1);
        setActionError(null);
        setFieldErrors({});
    }, []);

    /** Runs the same field checks the web client does before hitting the integration. */
    const applyClientFormValidation = useCallback((formValues: MmBlocksFormValues): boolean => {
        const validationErrors = validateMmBlocksFormValues(blocks, formValues);
        const names = Object.keys(validationErrors);
        if (names.length === 0) {
            setFieldErrors({});
            return true;
        }

        const nextErrors: MmBlocksFormErrors = {};
        for (const name of names) {
            nextErrors[name] = formatDialogFieldError(intl, validationErrors[name]);
        }
        setFieldErrors(nextErrors);
        setActionError(intl.formatMessage(messages.fixFieldErrors));
        return false;
    }, [blocks, intl]);

    const handleLegacySubmit = useCallback(async (formValues: MmBlocksFormValues, cancelled = false) => {
        // Block submit while uploads are in flight so file IDs make it into the submission.
        if (!cancelled && hasUploadingFields) {
            setActionError(intl.formatMessage(messages.filesUploading));
            return;
        }

        if (!cancelled && !applyClientFormValidation(formValues)) {
            return;
        }

        const convertedSubmission = formValuesToDialogSubmission(formValues);
        const fileIds = collectDialogFileIds(convertedSubmission, elements);

        const submission: DialogSubmission = {
            url: url || '',
            callback_id: callbackId || '',
            state: dialogStateValue || '',
            submission: convertedSubmission,
            user_id: '',
            channel_id: channelId || '',
            team_id: '',
            cancelled,
            ...(fileIds.length > 0 && {file_ids: fileIds}),
        };
        const {data, error} = await submitInteractiveDialog(serverUrl, submission);
        if (error) {
            setActionError(intl.formatMessage(messages.submitFailed));
            return;
        }
        if (data?.error) {
            setActionError(data.error);
            return;
        }
        if (data?.type === 'form' && data.form) {
            await applyLegacyFormResponse(data.form);
            return;
        }
        if (data?.errors && Object.keys(data.errors).length > 0) {
            setFieldErrors(data.errors);
            return;
        }
        setFieldErrors({});
        setActionError(null);
        await dismissMmBlocksExpandedContentIfOpen();
        await navigateBack();
    }, [applyClientFormValidation, applyLegacyFormResponse, callbackId, channelId, dialogStateValue, elements, hasUploadingFields, intl, serverUrl, url]);

    const handleLegacyRefresh = useCallback(async (fieldName: string, formValues: MmBlocksFormValues) => {
        if (!sourceUrlValue) {
            return;
        }
        const requestId = ++refreshRequestIdRef.current;
        const submission: DialogSubmission = {
            url: sourceUrlValue,
            callback_id: callbackId || '',
            state: dialogStateValue || '',
            submission: {...formValuesToDialogSubmission(formValues), selected_field: fieldName},
            user_id: '',
            channel_id: channelId || '',
            team_id: '',
            cancelled: false,
            type: 'refresh',
        };
        const {data, error} = await submitInteractiveDialog(serverUrl, submission);

        // A slower earlier refresh must not overwrite the form a newer one already replaced.
        if (requestId !== refreshRequestIdRef.current) {
            return;
        }
        if (error) {
            setActionError(intl.formatMessage(messages.refreshFailed));
            return;
        }
        if (data?.error) {
            setActionError(data.error);
            return;
        }
        if (data?.type === 'form' && data.form) {
            await applyLegacyFormResponse(data.form);
        }
        if (data?.errors && Object.keys(data.errors).length > 0) {
            setFieldErrors(data.errors);
        } else {
            setActionError(null);
        }
    }, [applyLegacyFormResponse, callbackId, channelId, dialogStateValue, intl, serverUrl, sourceUrlValue]);

    const handleLegacyActionButton = useCallback(async (actionUrl: string, context: Record<string, string>) => {
        if (!actionUrl) {
            logDebug('[BlocksDialogShell.handleLegacyActionButton] missing action url');
            return;
        }
        const {error} = await executeDialogAction(serverUrl, actionUrl, context);
        if (error) {
            setActionError(intl.formatMessage(messages.actionFailed));
        }
    }, [intl, serverUrl]);

    const handleNativeAction = useCallback(async ({
        actionId,
        selectedOption,
        query,
        formValues,
        subtype,
    }: ActionHandlerParams) => {
        const isSubmit = subtype === 'submit';
        if (isSubmit) {
            if (hasUploadingFields) {
                setActionError(intl.formatMessage(messages.filesUploading));
                return;
            }
            if (formValues && !applyClientFormValidation(formValues)) {
                return;
            }
        }

        // Sequence requests so a slow older response cannot overwrite a newer form.
        const requestId = ++refreshRequestIdRef.current;

        setActionError(null);
        if (!isSubmit) {
            setFieldErrors({});
        }

        const {data, error} = await doBlockAction(serverUrl, {
            subtype: 'execute',
            context: 'dialog',
            post_id: '',
            channel_id: channelId,
            action_id: actionId,
            cookie: effectiveCookie,
            selected_option: selectedOption,
            query,
            form_values: formValues,
            integration_format: 'mm_block',
        });

        if (requestId !== refreshRequestIdRef.current) {
            return;
        }

        if (error) {
            setActionError(intl.formatMessage(messages.actionFailed));
            return;
        }

        if (data?.error) {
            setActionError(data.error);
            return;
        }

        if (data?.errors && Object.keys(data.errors).length > 0) {
            setFieldErrors(data.errors);
            return;
        }

        setFieldErrors({});

        if (data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }

        // "dialog" stacks a child screen on top of this one; "refresh" replaces this form in place.
        if (data?.type === 'dialog' && data.block_dialog) {
            IntegrationsManager.getManager(serverUrl).setDialog({
                trigger_id: data.trigger_id || '',
                channel_id: channelId || '',
                block_dialog: data.block_dialog,
            });
            return;
        }

        if (data?.type === 'refresh' && data.block_dialog) {
            await applyBlockDialogResponse(data.block_dialog);
            return;
        }

        // Successful execute without a dialog refresh closes the dialog, unless the integration
        // asked to keep it open (e.g. it stacked a child dialog through dialogs/open).
        if (data?.keep_dialog_open) {
            return;
        }

        if (!data?.type || data.type === 'ok' || data.goto_location) {
            await dismissMmBlocksExpandedContentIfOpen();
            await navigateBack();
        }
    }, [applyBlockDialogResponse, applyClientFormValidation, channelId, effectiveCookie, hasUploadingFields, intl, serverUrl]);

    const handleAction: ActionHandler = useCallback(async (params) => {
        if (mode === 'native') {
            await handleNativeAction(params);
            return;
        }

        const {actionId, selectedOption, query, formValues} = params;

        // Legacy action_button elements (see convertDialogElementToMmBlock).
        if (query?.__dialog_action_button === '1') {
            const actionUrl = query.__dialog_action_url || '';
            const context = {...query};
            delete context.__dialog_action_button;
            delete context.__dialog_action_url;
            await handleLegacyActionButton(actionUrl, context);
            return;
        }

        // Field refresh (onChange action id equals the element name that triggered it).
        if (formValues && actionId !== DIALOG_SUBMIT_ACTION_ID && !selectedOption) {
            const isRefreshField = elements?.some((el) => el.name === actionId && el.refresh);
            if (isRefreshField) {
                await handleLegacyRefresh(actionId, formValues);
                return;
            }
        }

        if (actionId === DIALOG_SUBMIT_ACTION_ID) {
            await handleLegacySubmit(formValues || {});
        }
    }, [elements, handleLegacyActionButton, handleLegacyRefresh, handleLegacySubmit, handleNativeAction, mode]);

    const handleLookup: LookupHandler = useCallback(async (actionId, userInput, formValues) => {
        if (mode === 'native') {
            if (!blockActionsEnabled) {
                return [];
            }
            const {data} = await doBlockAction(serverUrl, {
                subtype: 'lookup',
                context: 'dialog',
                post_id: '',
                channel_id: channelId,
                action_id: actionId,
                cookie: effectiveCookie,
                query: {query: userInput},
                form_values: formValues,
                integration_format: 'mm_block',
            });
            return data?.items ?? [];
        }

        const element = elements?.find((el) => el.name === actionId);
        const lookupPath = element?.data_source_url || url || '';
        if (!isValidLookupURL(lookupPath)) {
            return [];
        }

        const submission: DialogSubmission = {
            url: lookupPath,
            callback_id: callbackId || '',
            state: dialogStateValue || '',
            submission: {
                ...formValuesToDialogSubmission(formValues || {}),
                query: userInput,
                selected_field: actionId,
            },
            user_id: '',
            channel_id: channelId || '',
            team_id: '',
            cancelled: false,
        };

        const {data} = await lookupInteractiveDialog(serverUrl, submission);
        return data?.items ?? [];
    }, [blockActionsEnabled, callbackId, channelId, dialogStateValue, effectiveCookie, elements, mode, serverUrl, url]);

    const handleNativeCancel = useCallback(async () => {
        setBusy(true);
        try {
            if (blockCancel?.action) {
                await handleNativeAction({actionId: blockCancel.action});
                return;
            }
            await dismissMmBlocksExpandedContentIfOpen();
            await navigateBack();
        } finally {
            setBusy(false);
        }
    }, [blockCancel, handleNativeAction]);

    const handleNativeSubmit = useCallback(async (formValues: MmBlocksFormValues) => {
        if (hasUploadingFields) {
            setActionError(intl.formatMessage(messages.filesUploading));
            return;
        }

        setBusy(true);
        try {
            if (blockSubmit?.action) {
                await handleNativeAction({
                    actionId: blockSubmit.action,
                    formValues,
                    subtype: 'submit',
                });
                return;
            }
            if (applyClientFormValidation(formValues)) {
                await dismissMmBlocksExpandedContentIfOpen();
                await navigateBack();
            }
        } finally {
            setBusy(false);
        }
    }, [applyClientFormValidation, blockSubmit, handleNativeAction, hasUploadingFields, intl]);

    const handleLegacyCancelPress = useCallback(async () => {
        setBusy(true);
        try {
            if (notifyOnCancel) {
                await handleLegacySubmit({}, true);
                return;
            }
            await dismissMmBlocksExpandedContentIfOpen();
            await navigateBack();
        } finally {
            setBusy(false);
        }
    }, [handleLegacySubmit, notifyOnCancel]);

    const content = (
        <KeyboardAwareScrollView
            style={style.scroll}
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={style.scrollContent}
            testID='interactive_dialog.scroll_view'
        >
            <BlockRenderer
                key={`dialog-blocks-${blocksEpoch}`}
                blocks={blocks}
                channelId={channelId || ''}
                errors={fieldErrors}
                location={Screens.DIALOG_ROUTER}
                onAction={handleAction}
                onErrorsChange={setFieldErrors}
                onLookup={handleLookup}
                onUploadingChange={setHasUploadingFields}
                postId=''
                omitForm={true}
                theme={theme}
            />
            {actionError && (
                <View style={style.actionError}>
                    <SectionNotice
                        location={Screens.DIALOG_ROUTER}
                        testID='interactive_dialog.error'
                        text={actionError}
                        title={intl.formatMessage(messages.errorTitle)}
                        type='danger'
                    />
                </View>
            )}
        </KeyboardAwareScrollView>
    );

    const showLegacySubmit = dialogShouldShowSubmitChrome(elements, submitLabel);
    const legacyBlockSubmit = showLegacySubmit ? {
        action: DIALOG_SUBMIT_ACTION_ID,
        label: submitLabel,
    } : undefined;

    const handleLegacyFooterSubmit = useCallback((formValues: MmBlocksFormValues) => {
        return handleLegacySubmit(formValues, false);
    }, [handleLegacySubmit]);

    return (
        <MmBlocksForm
            key={`dialog-form-${blocksEpoch}`}
            errors={fieldErrors}
            onErrorsChange={setFieldErrors}
        >
            <SafeAreaView
                edges={['bottom']}
                style={style.container}
            >
                {content}
                {mode === 'native' ? (
                    <NativeDialogFooter
                        blockSubmit={blockSubmit}
                        blockCancel={blockCancel}
                        onSubmit={handleNativeSubmit}
                        onCancel={handleNativeCancel}
                        busy={busy}
                        submitDisabled={hasUploadingFields}
                        theme={theme}
                    />
                ) : (
                    <NativeDialogFooter
                        blockSubmit={legacyBlockSubmit}
                        blockCancel={LEGACY_BLOCK_CANCEL}
                        onSubmit={handleLegacyFooterSubmit}
                        onCancel={handleLegacyCancelPress}
                        busy={busy}
                        submitDisabled={hasUploadingFields}
                        theme={theme}
                    />
                )}
            </SafeAreaView>
        </MmBlocksForm>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    blockActionsEnabled: observeBlockActionsEnabled(database),
}));

export default withDatabase(enhanced(BlocksDialogShell));
