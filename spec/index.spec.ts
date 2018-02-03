import { Task, Transaction } from "../src/index";

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

        const transaction = new Transaction();
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

        const transaction = new Transaction();
        transaction.add(...tasks);

        try {
            // Act
            await transaction.execute();
        } catch (error) {
            // Assert
            expect(rollback1Complete).toBeTruthy();
            expect(error.message).toBe('Test Error');
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

        const transaction = new Transaction();
        transaction.add(...tasks);

        // Act
        const results = await transaction.execute();

        // Assert
        expect(results[0]).toBe(7);
        expect(results.task2.message).toBe('42');
        return done();
    });
});
