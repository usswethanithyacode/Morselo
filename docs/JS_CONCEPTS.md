# Morselo JavaScript & Node.js Runtime Architecture

This document explains foundational JavaScript runtime concepts and how the **Node.js Event Loop** powers Morselo's asynchronous backend.

---

## 1. The JavaScript Event Loop in Node.js

### What is the Event Loop?
JavaScript is a **single-threaded** programming language, meaning it has one **Call Stack** and executes one operation at a time. Despite this single-threaded model, Morselo's Node.js Express server handles multiple concurrent HTTP requests, database queries, and external API calls without blocking.

This concurrency is made possible by the **Node.js Event Loop** (implemented via the **libuv** C library), which delegates expensive I/O operations (file system, network calls, database queries) to the operating system or worker thread pool and processes their completion callbacks asynchronously.

---

## 2. Core Architecture Components

```
┌───────────────────────────────────────────────────────────┐
│                        Call Stack                         │
│             (Executes Synchronous JavaScript)             │
└─────────────────────────────┬─────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Microtask Queue  │
                    │  1. nextTickQueue │
                    │  2. Promise Queue │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Event Loop Phases│
                    │  • Timers         │
                    │  • Pending I/O    │
                    │  • Idle, Prepare  │
                    │  • Poll (I/O)     │
                    │  • Check          │
                    │  • Close Callbacks│
                    └───────────────────┘
```

1. **Call Stack**: Where synchronous JavaScript functions are pushed, executed, and popped (LIFO: Last-In, First-Out).
2. **Microtask Queue**:
   - **`process.nextTick` Queue**: Highest priority microtask queue in Node.js.
   - **Promise Microtask Queue**: Handles resolved/rejected `Promise.then()`, `catch()`, `finally()`, and `async/await` continuations.
   - *Rule*: Microtasks are drained completely whenever the Call Stack becomes empty, before the Event Loop proceeds to the next phase.
3. **Event Loop Phases (Macrotasks / Timers)**:
   - **Timers Phase**: Executes callbacks scheduled by `setTimeout()` and `setInterval()`.
   - **Pending Callbacks**: Executes I/O callbacks deferred to the next loop iteration.
   - **Poll Phase**: Retrieves new I/O events (incoming network connections, data from disk/sockets).
   - **Check Phase**: Executes callbacks registered with `setImmediate()`.
   - **Close Callbacks**: Executes close events (e.g., `socket.on('close')`).

---

## 3. Runtime Execution Order Demonstration

Below is a verified demonstration script illustrating the execution order between synchronous code, microtasks, and event loop phases:

```javascript
// demo-event-loop.js
console.log('1. [Synchronous] Main script starts (Call Stack)');

setTimeout(() => {
    console.log('5. [Timers Phase] setTimeout callback executed');
}, 0);

setImmediate(() => {
    console.log('6. [Check Phase] setImmediate callback executed');
});

Promise.resolve().then(() => {
    console.log('4. [Microtask Queue - Promise] Promise.then resolved');
});

process.nextTick(() => {
    console.log('3. [Microtask Queue - nextTick] process.nextTick callback executed');
});

console.log('2. [Synchronous] Main script ends (Call Stack drained)');
```

### Observed Output & Explanation

```text
1. [Synchronous] Main script starts (Call Stack)
2. [Synchronous] Main script ends (Call Stack drained)
3. [Microtask Queue - nextTick] process.nextTick callback executed
4. [Microtask Queue - Promise] Promise.then resolved
6. [Check Phase] setImmediate callback executed
5. [Timers Phase] setTimeout callback executed
```

### Why This Order Occurs:
1. **Synchronous First (`1`, `2`)**: Statements execute immediately on the main Call Stack from top to bottom.
2. **NextTick Microtasks (`3`)**: Node.js processes `process.nextTick` immediately after the current operation finishes on the Call Stack.
3. **Promise Microtasks (`4`)**: Resolved Promise callbacks in the microtask queue run immediately after `nextTick` before the Event Loop enters its phases.
4. **Macrotasks / Loop Phases (`5`, `6`)**: Timers (`setTimeout`) and Check callbacks (`setImmediate`) execute when the Event Loop advances to their respective phases.

---

## 4. How the Event Loop Powers Morselo

In Morselo's backend ([`server/server.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/server.js)), operations such as:
- Querying PostgreSQL with Sequelize (`getCatalogIngredients`)
- Querying MongoDB Atlas with Mongoose (`Recipe.find()`, `Recipe.create()`)
- Sending AI generation prompts to Google Gemini API (`genAI.getGenerativeModel().generateContent()`)
- Verifying bcrypt password hashes (`bcrypt.compare()`)

are **asynchronous**. 

### Why Asynchronous Operations Never Block the Server:
1. When a client requests `POST /api/recipes/generate`, Express invokes the route handler.
2. When `await model.generateContent(...)` is reached, Node.js delegates the HTTPS network request to the OS and frees the Call Stack immediately.
3. While the Gemini API processes the recipe prompt, the server's single thread is free to handle incoming requests from other users (e.g., `GET /api/ingredients` or user login).
4. When the API response arrives, its callback/Promise resolution is queued in the microtask queue, resuming execution to send the HTTP response back to the client.
