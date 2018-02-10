export interface Task {
    /**
     * The name of the task. This can be used to retrieve intermediate results.
     */
    name: string;

    /**
     * The main function to run.
     * @param context A collection of intermediate results from previous tasks.
     */
    execute(context: TransactionResults): Promise<any> | any;

    /**
     * A function that effectively reverses the main function.
     * @param context A collection of intermediate results from previous tasks.
     */
    rollback(context: TransactionResults): Promise<void> | void;
}

export interface TransactionResults {
    [name: string]: any;
    [index: number]: any;
    final: any;
}

export interface TransactionError {
    cause: any;
    rollbackErrors: any[];
}

export class Transaction implements Task {
    public name: string;

    private tasks: Task[] = [];

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Add one or more tasks to be executed as part of this transaction
     * @param tasks One or more tasks to be added
     */
    public add(...tasks: Task[]): void {
        this.tasks.push(...tasks);
    }

    /**
     * Executes all tasks in the order they were added. The Promise resolves when all tasks have been completed.
     * If a task fails, all completed tasks will be rolled back in reverse order, and the Promise will be rejected with
     * the original failure.
     * @returns An array containing the results of each task, in order.
     * Results can be accessed by task name or by index.
     * @throws {TransactionError} Will throw an error if any task fails. The error will contain the cause of the failure
     * and any errors that occur during rollback. 
     */
    public async execute(): Promise<TransactionResults> {
        const results: TransactionResults = {
            final: null
        };
        let stage = -1;

        try {
            for (const task of this.tasks) {
                const result = await task.execute(results);
                stage++;

                results[stage] = result;
                results[task.name] = result;
            }

            // Update the final result
            results.final = results[stage];

            return results;
        } catch (cause) {
            let rollbackErrors = [];
            try {
                await this.rollback(results, stage);
            } catch (errors) {
                rollbackErrors = errors;
            }

            const error: TransactionError = {
                cause, rollbackErrors
            };
            throw error;
        }
    }

    public async rollback(context: TransactionResults, currentStage: number = this.tasks.length - 1): Promise<void> {
        const rollbackErrors = [];

        for (let i = currentStage; i >= 0; i--) {
            const task = this.tasks[i];

            try {
                await task.rollback(context);
            } catch (rollbackError) {
                rollbackErrors.push(rollbackError);
            }
        }

        if (rollbackErrors.length) {
            throw rollbackErrors;
        }
    }
}
