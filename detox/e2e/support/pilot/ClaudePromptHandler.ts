// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';

import {Anthropic} from '@anthropic-ai/sdk';

export class ClaudePromptHandler {
    private anthropic: Anthropic;
    private cacheDir: string;
    private cacheEnabled: boolean;

    constructor(apiKey: string, cacheDir?: string) {
        this.anthropic = new Anthropic({
            apiKey,
        });
        this.cacheDir = cacheDir || path.join(process.cwd(), 'detox/e2e/test/products/playbooks/__pilot_cache__');
        this.cacheEnabled = true;

        // Ensure cache directory exists
        if (this.cacheEnabled && !fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, {recursive: true});
        }
    }

    private getCacheFilePath(testName: string): string {
        return path.join(this.cacheDir, `${testName}.json`);
    }

    private loadCache(testName: string): Record<string, any> {
        try {
            const cacheFile = this.getCacheFilePath(testName);
            if (fs.existsSync(cacheFile)) {
                return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
        return {};
    }

    private saveCache(testName: string, cache: Record<string, any>): void {
        try {
            const cacheFile = this.getCacheFilePath(testName);
            fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    async runPrompt(prompt: string, testName?: string): Promise<string> {
        // If caching is enabled and testName is provided
        if (this.cacheEnabled && testName) {
            const cache = this.loadCache(testName);

            // Check if we have a cached response
            if (cache[prompt] && Array.isArray(cache[prompt]) && cache[prompt].length > 0) {
                const cachedEntry = cache[prompt][0];
                if (cachedEntry.value && cachedEntry.value.code) {
                    console.log('Using cached response for prompt');
                    return cachedEntry.value.code;
                }
            }
        }

        // No cache hit, make API call
        console.log('Making API call to Claude');
        const response = await this.anthropic.messages.create({
            model: 'claude-opus-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            system: 'Generate Detox test steps.',
        });

        // Extract text from the first content block
        const firstContent = response.content[0];
        if (firstContent && firstContent.type === 'text') {
            const result = firstContent.text;

            // Save to cache if enabled
            if (this.cacheEnabled && testName) {
                const cache = this.loadCache(testName);
                cache[prompt] = [{
                    value: {code: result},
                    creationTime: Date.now(),
                }];
                this.saveCache(testName, cache);
            }

            return result;
        }

        // Return empty string if no text content is found
        return '';
    }

    isSnapshotImageSupported = () => false; // Disable images for Mattermost tests
}
