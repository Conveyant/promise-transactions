export class TransactionError extends Error {
    public cause: any;
    public rollbackErrors: any[] = [];
}