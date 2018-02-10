import { TransactionError } from "./transaction-error";
import { InvalidOperationError } from "./invalid-operation-error";

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

export enum TransactionState {
    NotStarted, Running, Finished
}

export class Transaction implements Task {
    public name: string;

    private tasks: Task[] = [];
    private state: TransactionState = TransactionState.NotStarted;

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
     * @throws {InvalidOperationError} Will throw an error if the list of tasks is empty, or if the Transaction is in
     * a state other than NotStarted.
     */
    public async execute(): Promise<TransactionResults> {
        if (!this.tasks.length) {
            throw new InvalidOperationError('A Transaction can only be executed with at least one Task.');
        }
        if (this.state !== TransactionState.NotStarted) {
            throw new InvalidOperationError('A Transaction can only be executed once.');
        }

        this.state = TransactionState.Running;

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

            this.state = TransactionState.Finished;
            return results;
        } catch (cause) {
            let rollbackErrors = [];
            try {
                await this.internalRollback(results, stage);
            } catch (errors) {
                rollbackErrors = errors;
            }

            const error: TransactionError = new TransactionError();
            error.cause = cause;
            error.rollbackErrors = rollbackErrors;
            throw error;
        }
    }

    /**
     * Rollback all Tasks associated with this Transaction. Tasks will be rolled back in reverse order from how
     * they were added.
     * @param context A collection of intermediate results from previously executed tasks.
     * @throws {InvalidOperationError} Will throw an error if the Transaction has not yet completed.
     */
    public async rollback(context: TransactionResults): Promise<void> {
        if (this.state !== TransactionState.Finished) {
            throw new InvalidOperationError('A Transaction cannot be rolled back until it has been executed fully.');
        }

        await this.internalRollback(context, this.tasks.length - 1);
    }

    private async internalRollback(context: TransactionResults, currentStage: number): Promise<void> {
        const rollbackErrors = [];

        for (let i = currentStage; i >= 0; i--) {
            const task = this.tasks[i];

            try {
                await task.rollback(context);
            } catch (rollbackError) {
                rollbackErrors.push(rollbackError);
            }
        }

        this.state = TransactionState.NotStarted;

        if (rollbackErrors.length) {
            throw rollbackErrors;
        }
    }
}
