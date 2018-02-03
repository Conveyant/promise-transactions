export interface Task {
    execute(): Promise<any> | any;
    rollback(): Promise<void> | void;
}

export class Transaction {
    private stage: number = -1;
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
     * @returns An array containing the results of each task, in order
     */
    public async execute(): Promise<any[]> {
        const results = [];

        try {
            for (const task of this.tasks) {
                const result = await task.execute();
                results.push(result);
                this.stage++;
            }

            return results;
        } catch (error) {
            for (let i = this.stage; i >= 0; i--) {
                const task = this.tasks[i];
                await task.rollback();
            }

            throw error;
        }
    }
}
