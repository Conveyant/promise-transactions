# Promise Transactions
Transactions engine for Promise-based asynchronous operations

## Install

This package can be installed using npm with the following command:
```bash
npm install --save promise-transactions
```

Yarn may also be used to install this package.
```bash
yarn add promise-transactions
```

## Usage

### Import

For ES5/JavaScript, the package can be `require`d as normal.
```javascript
var Transaction = require('promise-transactions').Transaction;
```

For ES6/TypeScript, the package can also be `import`ed.
```typescript
import { Transaction } from 'promise-transactions';
```

### Tasks

The fundamental unit of a `Transaction` is a `Task` that can be executed and (if necessary) rolled back. Each `Task` must have a unique name. This name can be used to retrieve intermediate results during and after execution. Intermediate results are stored in a context object that is passed to the `execute` and `rollback` functions of the `Task`.

For example:
```javascript
var task = {
    name: 'myTask',
    execute: function(context) {
        return 7;
    },
    rollback: function(context) {
        console.log(context.myTask); // 7
    }
};
```

ES6/TypeScript arrow functions may also be used.
```typescript
import { Task } from 'promise-transactions';

const task: Task = {
    name: 'myTask',
    execute: (context) => 7,
    rollback: (context) => console.log(context.myTask) // 7
};
```

Note that the execute and rollback functions of a `Task` may return a direct value (synchronous) or return a `Promise` (asynchronous). For traditional callback-style asynchronous functions, the functions [util.promisify](https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original) or [Bluebird.promisify](http://bluebirdjs.com/docs/api/promise.promisify.html) may be useful.

### Defining a Transaction

A `Transaction` object must be created before `Task`s may be added to it.
```javascript
var transaction = new Transaction();
```

`Task`s may be added one at a time or in a params-style list. Note that `Task`s will be executed in the order they were added and will be rolled back in the reverse order.
```javascript
transaction.add(task1);
transaction.add(task2, task3, task4);
```

Using the ES6/TypeScript spread operator, an entire array can be added at once.
```typescript
let tasks: Task[];
...
transaction.add(...tasks);
```

### Executing the Transaction

Once all necessary `Task`s have been added, the `Transaction` can be started with the `execute` function. This function returns a `Promise` which resolves when all `Task`s have been completed successfully. The returned object will contain the result of each `Task` which can be accessed by name or index. If one `Task` fails, all `Task`s that succeeded will be rolled back, and the `Promise` will be rejected. The error returned by the rejected `Promise` will contain the original error that caused the failure as well as any errors that occurred during rollback.
```javascript
transaction.execute().then(function (results) {
    console.log(results[0]); // The first result
    console.log(result.myTask); // The result of 'myTask'
}).catch(function (error) {
    console.error(error.cause); // The original failure
    console.error(error.rollbackErrors); // Array of errors during rollback
});
```

Similar results can be achieved with TypeScript's `async` and `await` features.
```typescript
import { Transaction, TransactionResults, TransactionError } from 'promise-transactions';

try {
    const results: TransactionResults = await transaction.execute();
    console.log(results[0]); // The first result
    console.log(result.myTask); // The result of 'myTask'
} catch (e) {
    const error: TransactionError = e;
    console.error(error.cause); // The original failure
    console.error(error.rollbackErrors); // Array of errors during rollback.
}
```

### TypeScript definitions

A TypeScript definition file is included as part of the package.

## Building

This package is written in TypeScript and can be executed using `ts-node`. To "transpile" the code into regular JavaScript, execute the `build` task.
```bash
npm run build
```

## Testing

Tests are found in the `spec` folder and use the `jasmine` framework. Tests can be run through the `test` task.
```bash
npm test
```

## Issues

Any bugs or improvements are appreciated and could be posted at https://github.com/Conveyant/promise-transactions/issues.

## Credits

This package was inspired by [node-transactions](https://github.com/ceoworks/node-transactions). Much of the logic and API were taken from that package. The primary difference is that `node-transactions` uses generator functions while `promise-transactions` uses native `Promise`s.
