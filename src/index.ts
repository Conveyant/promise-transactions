export interface Task {
    name: string;
    execute(): Promise<any> | any;
    rollback(): Promise<void> | void;
}

export interface TransactionResults {
    [name: string]: any;
    [index: number]: any;
}

export class Transaction {
    private tasks: Task[] = [];

    /**
     * Add one or more tasks to be executed as part of this transaction
     * @param tasks One or more tasks to be added
     */
    public add(...tasks: Task[]): void {
        this.tasks.push(...tasks);
    }

    /**
     * Executes all tasks in the order they were added. The Promise resolves when all tasks have been completed.
     * If a task fails, all completed tasks will be rolled back, and the Promise will be rejected with
     * the original failure.
     * @returns An array containing the results of each task, in order.
     * Results can be accessed by task name or by index.
     */
    public async execute(): Promise<TransactionResults> {
        const results: TransactionResults = {};
        let stage = -1;

        try {
            for (const task of this.tasks) {
                const result = await task.execute();
                stage++;

                results[stage] = result;
                results[task.name] = result;
            }

            return results;
        } catch (error) {
            for (let i = stage; i >= 0; i--) {
                const task = this.tasks[i];
                await task.rollback();
            }

            throw error;
        }
    }
}
