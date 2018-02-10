import { InvalidOperationError, Task, Transaction } from "../src/index";

describe('promise-transactions', () => {
    it('should execute all tasks', async (done) => {
        // Arrange
        let task1Complete = false;
        let task2Complete = false;
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => {
                    task1Complete = true;
                },
                rollback: () => { }
            },
            {
                name: 'task2',
                execute: () => {
                    task2Complete = true;
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        // Act
        await transaction.execute();

        // Assert
        expect(task1Complete).toBeTruthy();
        expect(task2Complete).toBeTruthy();
        return done();
    });

    it('should rollback completed tasks', async (done) => {
        // Arrange
        let rollback1Complete = false;
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => { },
                rollback: () => {
                    rollback1Complete = true;
                }
            },
            {
                name: 'task2',
                execute: () => {
                    throw new Error('Test Error');
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        try {
            // Act
            await transaction.execute();
        } catch (error) {
            // Assert
            expect(rollback1Complete).toBeTruthy();
            expect(error.cause.message).toBe('Test Error');
        }

        return done();
    });

    it('should return task values', async (done) => {
        // Arrange
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => {
                    return 7;
                },
                rollback: () => { }
            },
            {
                name: 'task2',
                execute: () => {
                    return { message: '42' };
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        // Act
        const results = await transaction.execute();

        // Assert
        expect(results[0]).toBe(7);
        expect(results.task2.message).toBe('42');
        return done();
    });

    it('should pass intermediate results to tasks', async (done) => {
        // Arrange
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => {
                    return 7;
                },
                rollback: () => { }
            },
            {
                name: 'task2',
                execute: context => {
                    return context.task1 + 7;
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        // Act
        const results = await transaction.execute();

        // Assert
        expect(results.task2).toBe(14);
        return done();
    });

    it('should explicitly name the final result', async (done) => {
        // Arrange
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => {
                    return 7;
                },
                rollback: () => { }
            },
            {
                name: 'task2',
                execute: () => {
                    return 42;
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        // Act
        const results = await transaction.execute();

        // Assert
        expect(results.final).toBe(42);
        return done();
    });

    it('should throw rollback errors', async (done) => {
        // Arrange
        const tasks: Task[] = [
            {
                name: 'task1',
                execute: () => { },
                rollback: () => {
                    throw new Error('Error in rollback');
                }
            },
            {
                name: 'task2',
                execute: () => {
                    throw new Error('Test Error');
                },
                rollback: () => { }
            }
        ];

        const transaction = new Transaction('tasks');
        transaction.add(...tasks);

        try {
            // Act
            await transaction.execute();
        } catch (error) {
            // Assert
            expect(error.rollbackErrors[0].message).toBe('Error in rollback');
        }

        return done();
    });

    it('should allow nested transactions', async (done) => {
        // Arrange
        const tasks: Task[] = [
            {
                name: 'inner1',
                execute: () => {
                    return 7;
                },
                rollback: () => { }
            },
            {
                name: 'inner2',
                execute: context => {
                    return context.inner1 + 7;
                },
                rollback: () => { }
            }
        ];

        const inner = new Transaction('inner');
        inner.add(...tasks);

        const transaction = new Transaction('outer');
        transaction.add(inner);
        transaction.add({
            name: 'outerTask',
            execute: context => {
                return context.inner.final + 10;
            },
            rollback: () => { }
        });

        // Act
        let results = { final: 1 };
        try {
            results = await transaction.execute();

        } catch (error) {
            fail(error);
        }

        // Assert
        expect(results.final).toBe(24);
        return done();
    });

    it('should throw an error if executed without tasks', async (done) => {
        // Arrange
        const transaction = new Transaction('noTasks');

        try {
            // Act
            await transaction.execute();
        } catch (error) {
            // Assert
            expect(error.message).toContain('at least one Task');
        }

        return done();
    });

    it('should throw an error if executed twice', async (done) => {
        // Arrange
        const transaction = new Transaction('noTasks');
        transaction.add({
            name: 'empty',
            execute: () => { },
            rollback: () => { }
        });

        try {
            // Act
            await transaction.execute();
            await transaction.execute();
        } catch (error) {
            // Assert
            expect(error.message).toContain('only be executed once.');
        }

        return done();
    });

    it('should throw an error if rolled back before executing', async (done) => {
        // Arrange
        const transaction = new Transaction('noTasks');
        transaction.add({
            name: 'empty',
            execute: () => { },
            rollback: () => { }
        });

        try {
            // Act
            await transaction.rollback({ final: null });
        } catch (error) {
            // Assert
            expect(error.message).toContain('cannot be rolled back');
        }

        return done();
    });
});
