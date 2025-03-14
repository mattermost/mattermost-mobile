// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export class Calculator {
    private history: Array<{ operation: string; result: number }> = [];

    add(a: number, b: number): number {
        const result = a + b;
        this.history.push({operation: 'add', result});
        return result;
    }

    subtract(a: number, b: number): number {
        const result = a - b;
        this.history.push({operation: 'subtract', result});
        return result;
    }

    multiply(a: number, b: number): number {
        const result = a * b;
        this.history.push({operation: 'multiply', result});
        return result;
    }

    divide(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        const result = a / b;
        this.history.push({operation: 'divide', result});
        return result;
    }

    power(base: number, exponent: number): number {
        if (exponent < 0) {
            throw new Error('Negative exponents not supported');
        }
        const result = Math.pow(base, exponent);
        this.history.push({operation: 'power', result});
        return result;
    }

    getHistory(): Array<{ operation: string; result: number }> {
        return [...this.history];
    }

    clearHistory(): void {
        this.history = [];
    }
}
