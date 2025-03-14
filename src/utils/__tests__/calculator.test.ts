// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Calculator} from '../calculator';

describe('Calculator', () => {
    let calculator: Calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    describe('basic operations', () => {
        it('should add two numbers', () => {
            expect(calculator.add(2, 3)).toBe(5);
        });

        it('should subtract two numbers', () => {
            expect(calculator.subtract(5, 3)).toBe(2);
        });

        it('should multiply two numbers', () => {
            expect(calculator.multiply(4, 3)).toBe(12);
        });

        // Intentionally not testing divide by zero case
        it('should divide two numbers', () => {
            expect(calculator.divide(6, 2)).toBe(3);
        });
    });

    // Not testing power function at all

    describe('history', () => {
        it('should store operation history', () => {
            calculator.add(2, 3);
            calculator.multiply(4, 2);

            const history = calculator.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0]).toEqual({operation: 'add', result: 5});
            expect(history[1]).toEqual({operation: 'multiply', result: 8});
        });

        // Not testing clearHistory
    });
});
