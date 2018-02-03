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

    public async execute(): Promise<void> {
        try {
            for (const task of this.tasks) {
                await task.execute();
                this.stage++;
            }
        } catch (error) {
            for (let i = this.stage; i >= 0; i--) {
                const task = this.tasks[i];
                await task.rollback();
            }

            throw error;
        }
    }
}
