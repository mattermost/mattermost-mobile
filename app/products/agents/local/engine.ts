// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {File, Paths} from 'expo-file-system';
import {Platform} from 'react-native';
import {createLLM, type Backend, type LiteRTLMInstance} from 'react-native-litert-lm';

import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {
    LOCAL_AGENT_BACKEND,
    LOCAL_AGENT_MAX_CONTEXT_TOKENS,
    LOCAL_AGENT_MAX_OUTPUT_TOKENS,
    LOCAL_AGENT_MODEL_FILENAME,
} from './constants';
import {LOCAL_AGENT_TOOL_DEFINITIONS} from './tool_definitions';

let llmInstance: LiteRTLMInstance | null = null;
let loadPromise: Promise<LiteRTLMInstance> | null = null;
let modelAvailable: boolean | null = null;
let loadedBackend: Backend | undefined;

/** Backend requested for the loaded model. The native engine may still fall back GPU→CPU internally ("[LiteRTLM] … fell back to CPU" in the Xcode console). */
export function getLoadedLocalAgentBackend(): Backend | undefined {
    return loadedBackend;
}

function getBundledModelFile(): File {
    return new File(Paths.bundle, 'LocalModels', LOCAL_AGENT_MODEL_FILENAME);
}

function toFilesystemPath(uri: string): string {
    return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function toMb(bytes: number): number {
    return Math.round(bytes / (1024 * 1024));
}

async function loadWithBackend(llm: LiteRTLMInstance, modelPath: string, backend: Backend) {
    logDebug('LocalAgent.engine: loading model', {backend});
    const startedAt = Date.now();
    await llm.loadModel(modelPath, {
        backend,
        maxContextTokens: LOCAL_AGENT_MAX_CONTEXT_TOKENS,
        maxOutputTokens: LOCAL_AGENT_MAX_OUTPUT_TOKENS,
        tools: LOCAL_AGENT_TOOL_DEFINITIONS,
        temperature: 0.3,
        multimodal: false,

        // The wrapper's pre-flight estimate treats the whole file as resident, but Gemma 4 E2B
        // memory-maps its 1.12 GB of embeddings (measured peak ~0.6 GB CPU / ~1.45 GB GPU on iPhone),
        // so the estimate rejects loads that actually fit.
        forceLoad: true,
    });

    loadedBackend = backend;
    const usage = llm.getMemoryUsage();
    logDebug('LocalAgent.engine: model loaded', {
        backend,
        loadMs: Date.now() - startedAt,
        residentMb: toMb(usage.residentBytes),
        availableMb: toMb(usage.availableMemoryBytes),
    });
}

export function isLocalAgentAvailable(): boolean {
    if (Platform.OS !== 'ios') {
        return false;
    }

    if (modelAvailable !== null) {
        return modelAvailable;
    }

    try {
        const file = getBundledModelFile();
        modelAvailable = Boolean(file.exists);
        if (!modelAvailable) {
            logDebug('LocalAgent.engine: bundled model missing', LOCAL_AGENT_MODEL_FILENAME);
        }
        return modelAvailable;
    } catch (error) {
        logDebug('LocalAgent.engine: failed to check model availability', error);
        modelAvailable = false;
        return false;
    }
}

export async function getLocalAgentEngine(): Promise<LiteRTLMInstance> {
    if (llmInstance?.isReady()) {
        return llmInstance;
    }

    if (llmInstance) {
        logDebug('LocalAgent.engine: engine is no longer ready, reloading');
        llmInstance = null;
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = (async () => {
        if (Platform.OS !== 'ios') {
            throw new Error('Local agent is only supported on iOS');
        }

        const file = getBundledModelFile();
        if (!file.exists) {
            throw new Error(`Bundled model not found: ${LOCAL_AGENT_MODEL_FILENAME}`);
        }

        const llm = createLLM({enableMemoryTracking: true});

        // iOS raises system-wide "critical" pressure readily once a multi-GB model is mapped, and unloading
        // from here races with in-flight turns on the engine's serial queue. Log only; Jetsam handles real exhaustion.
        llm.setMemoryWarningCallback((level, usage) => {
            logDebug('LocalAgent.engine: memory warning', {level, residentMb: toMb(usage.residentBytes), availableMb: toMb(usage.availableMemoryBytes)});
        });

        const modelPath = toFilesystemPath(file.uri);
        if (LOCAL_AGENT_BACKEND === 'gpu') {
            try {
                await loadWithBackend(llm, modelPath, 'gpu');
            } catch (error) {
                // The native fallback chain only covers engine creation; a GPU conversation that fails to allocate needs a CPU retry.
                logDebug('LocalAgent.engine: GPU load failed, retrying on CPU', getFullErrorMessage(error));
                await llm.unload().catch(() => undefined);
                await loadWithBackend(llm, modelPath, 'cpu');
            }
        } else {
            await loadWithBackend(llm, modelPath, 'cpu');
        }

        llmInstance = llm;
        modelAvailable = true;
        return llm;
    })();

    try {
        return await loadPromise;
    } finally {
        loadPromise = null;
    }
}

export async function unloadLocalAgentEngine(): Promise<void> {
    if (!llmInstance) {
        return;
    }

    const instance = llmInstance;
    llmInstance = null;
    try {
        await instance.unload();
    } catch (error) {
        logError('LocalAgent.engine: unload failed', error);
    }
}

export function resetLocalAgentAvailabilityCache(): void {
    modelAvailable = null;
}
