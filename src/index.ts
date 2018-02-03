export interface Task {
    execute(context: any): Promise<any> | any;
    rollback(context: any): Promise<void> | void;
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
}
