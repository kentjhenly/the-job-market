-- ============================================================
-- 0003_seed_challenges.sql
-- Seed data: 5 tech vertical challenges with MCQ questions
-- ============================================================

-- Challenge 1: JavaScript Fundamentals
insert into challenges (id, vertical, title, description, time_limit_sec, max_score, is_active) values
(
  '11111111-0000-0000-0000-000000000001',
  'tech',
  'JavaScript Fundamentals',
  'Core JavaScript concepts: closures, prototypes, async patterns, and modern ES6+ features. 20 questions, 30 minutes.',
  1800,
  100,
  true
);

insert into questions (challenge_id, type, prompt, options, correct_answer, weight, order_index) values
(
  '11111111-0000-0000-0000-000000000001',
  'multiple_choice',
  'What is the output of: console.log(typeof null)?',
  '[{"id":"a","text":"\"null\""},{"id":"b","text":"\"object\""},{"id":"c","text":"\"undefined\""},{"id":"d","text":"\"number\""}]',
  'b',
  1.0,
  1
),
(
  '11111111-0000-0000-0000-000000000001',
  'multiple_choice',
  'Which method creates a shallow copy of an array?',
  '[{"id":"a","text":"array.copy()"},{"id":"b","text":"array.clone()"},{"id":"c","text":"[...array]"},{"id":"d","text":"array.duplicate()"}]',
  'c',
  1.0,
  2
),
(
  '11111111-0000-0000-0000-000000000001',
  'multiple_choice',
  'What does the "use strict" directive do?',
  '[{"id":"a","text":"Enables all ES6 features"},{"id":"b","text":"Prevents the use of var keyword"},{"id":"c","text":"Throws errors for unsafe actions that would otherwise fail silently"},{"id":"d","text":"Disables the prototype chain"}]',
  'c',
  1.0,
  3
),
(
  '11111111-0000-0000-0000-000000000001',
  'multiple_choice',
  'What is a closure in JavaScript?',
  '[{"id":"a","text":"A function that has no return value"},{"id":"b","text":"A function that remembers the scope in which it was created"},{"id":"c","text":"A function that is immediately invoked"},{"id":"d","text":"A function with no parameters"}]',
  'b',
  1.5,
  4
),
(
  '11111111-0000-0000-0000-000000000001',
  'multiple_choice',
  'What is the difference between == and ===?',
  '[{"id":"a","text":"No difference"},{"id":"b","text":"=== checks type and value; == only checks value with coercion"},{"id":"c","text":"== checks type and value; === only checks value"},{"id":"d","text":"=== is slower than =="}]',
  'b',
  1.0,
  5
);

-- Challenge 2: System Design Fundamentals
insert into challenges (id, vertical, title, description, time_limit_sec, max_score, is_active) values
(
  '11111111-0000-0000-0000-000000000002',
  'tech',
  'System Design Fundamentals',
  'Assess your understanding of distributed systems, scalability patterns, databases, and architecture trade-offs.',
  2400,
  100,
  true
);

insert into questions (challenge_id, type, prompt, options, correct_answer, weight, order_index) values
(
  '11111111-0000-0000-0000-000000000002',
  'multiple_choice',
  'What is the primary purpose of a CDN (Content Delivery Network)?',
  '[{"id":"a","text":"To store database backups"},{"id":"b","text":"To serve static assets from edge nodes closer to users"},{"id":"c","text":"To compress server-side code"},{"id":"d","text":"To manage DNS records"}]',
  'b',
  1.0,
  1
),
(
  '11111111-0000-0000-0000-000000000002',
  'multiple_choice',
  'Which consistency model does eventual consistency describe?',
  '[{"id":"a","text":"All reads immediately reflect the latest write"},{"id":"b","text":"Reads may return stale data but will converge to the latest write over time"},{"id":"c","text":"No two nodes ever disagree"},{"id":"d","text":"Writes are rejected unless all replicas confirm"}]',
  'b',
  1.5,
  2
),
(
  '11111111-0000-0000-0000-000000000002',
  'multiple_choice',
  'What problem does database sharding solve?',
  '[{"id":"a","text":"Data duplication across tables"},{"id":"b","text":"Horizontal scaling by distributing data across multiple nodes"},{"id":"c","text":"Reducing query complexity"},{"id":"d","text":"Enforcing foreign key constraints at scale"}]',
  'b',
  1.5,
  3
),
(
  '11111111-0000-0000-0000-000000000002',
  'multiple_choice',
  'In the CAP theorem, which two properties can a distributed system guarantee simultaneously during a network partition?',
  '[{"id":"a","text":"Consistency and Availability"},{"id":"b","text":"Availability and Partition Tolerance"},{"id":"c","text":"Consistency and Partition Tolerance"},{"id":"d","text":"All three simultaneously"}]',
  'b',
  2.0,
  4
),
(
  '11111111-0000-0000-0000-000000000002',
  'multiple_choice',
  'What is the main advantage of a message queue in a distributed architecture?',
  '[{"id":"a","text":"Reduces database write latency"},{"id":"b","text":"Decouples producers and consumers, enabling async processing and back-pressure"},{"id":"c","text":"Eliminates the need for load balancers"},{"id":"d","text":"Provides synchronous request-response patterns"}]',
  'b',
  1.5,
  5
);

-- Challenge 3: React & TypeScript
insert into challenges (id, vertical, title, description, time_limit_sec, max_score, is_active) values
(
  '11111111-0000-0000-0000-000000000003',
  'tech',
  'React & TypeScript',
  'Test your knowledge of React hooks, component patterns, TypeScript types, and modern frontend architecture.',
  1800,
  100,
  true
);

insert into questions (challenge_id, type, prompt, options, correct_answer, weight, order_index) values
(
  '11111111-0000-0000-0000-000000000003',
  'multiple_choice',
  'When does useEffect run when given an empty dependency array []?',
  '[{"id":"a","text":"On every render"},{"id":"b","text":"Only on the first render (mount)"},{"id":"c","text":"Only on unmount"},{"id":"d","text":"It never runs"}]',
  'b',
  1.0,
  1
),
(
  '11111111-0000-0000-0000-000000000003',
  'multiple_choice',
  'What is the purpose of useMemo?',
  '[{"id":"a","text":"To memoize the component itself"},{"id":"b","text":"To cache a computed value between renders when dependencies haven''t changed"},{"id":"c","text":"To persist state between page reloads"},{"id":"d","text":"To prevent all re-renders"}]',
  'b',
  1.5,
  2
),
(
  '11111111-0000-0000-0000-000000000003',
  'multiple_choice',
  'In TypeScript, what is the difference between interface and type?',
  '[{"id":"a","text":"No difference — they are identical"},{"id":"b","text":"interface can be extended and merged; type is more flexible with unions and intersections"},{"id":"c","text":"type is for objects only; interface is for primitives"},{"id":"d","text":"interface is deprecated in TypeScript 5"}]',
  'b',
  1.5,
  3
),
(
  '11111111-0000-0000-0000-000000000003',
  'multiple_choice',
  'What does React.memo do?',
  '[{"id":"a","text":"Memoizes state values inside a component"},{"id":"b","text":"Prevents a function component from re-rendering if its props haven''t changed"},{"id":"c","text":"Caches API responses"},{"id":"d","text":"Replaces useCallback"}]',
  'b',
  1.0,
  4
),
(
  '11111111-0000-0000-0000-000000000003',
  'multiple_choice',
  'Which hook would you use to avoid prop drilling across deeply nested components?',
  '[{"id":"a","text":"useRef"},{"id":"b","text":"useReducer"},{"id":"c","text":"useContext"},{"id":"d","text":"useCallback"}]',
  'c',
  1.0,
  5
);

-- Challenge 4: Data Structures & Algorithms
insert into challenges (id, vertical, title, description, time_limit_sec, max_score, is_active) values
(
  '11111111-0000-0000-0000-000000000004',
  'tech',
  'Data Structures & Algorithms',
  'Big-O complexity, common data structures, sorting, searching, and algorithm design patterns.',
  2700,
  100,
  true
);

insert into questions (challenge_id, type, prompt, options, correct_answer, weight, order_index) values
(
  '11111111-0000-0000-0000-000000000004',
  'multiple_choice',
  'What is the time complexity of binary search on a sorted array of n elements?',
  '[{"id":"a","text":"O(n)"},{"id":"b","text":"O(n log n)"},{"id":"c","text":"O(log n)"},{"id":"d","text":"O(1)"}]',
  'c',
  1.0,
  1
),
(
  '11111111-0000-0000-0000-000000000004',
  'multiple_choice',
  'Which data structure uses LIFO (Last In, First Out) ordering?',
  '[{"id":"a","text":"Queue"},{"id":"b","text":"Stack"},{"id":"c","text":"Heap"},{"id":"d","text":"Linked List"}]',
  'b',
  1.0,
  2
),
(
  '11111111-0000-0000-0000-000000000004',
  'multiple_choice',
  'What is the worst-case time complexity of QuickSort?',
  '[{"id":"a","text":"O(n log n)"},{"id":"b","text":"O(n)"},{"id":"c","text":"O(n²)"},{"id":"d","text":"O(log n)"}]',
  'c',
  1.5,
  3
),
(
  '11111111-0000-0000-0000-000000000004',
  'multiple_choice',
  'A hash table with a good hash function provides which average-case complexity for lookup?',
  '[{"id":"a","text":"O(n)"},{"id":"b","text":"O(log n)"},{"id":"c","text":"O(1)"},{"id":"d","text":"O(n log n)"}]',
  'c',
  1.0,
  4
),
(
  '11111111-0000-0000-0000-000000000004',
  'multiple_choice',
  'What algorithmic technique does dynamic programming use to avoid redundant computation?',
  '[{"id":"a","text":"Recursion with random restarts"},{"id":"b","text":"Memoisation or tabulation of overlapping subproblem results"},{"id":"c","text":"Greedy selection of the locally optimal choice"},{"id":"d","text":"Divide and conquer without overlap"}]',
  'b',
  2.0,
  5
);

-- Challenge 5: SQL & Databases
insert into challenges (id, vertical, title, description, time_limit_sec, max_score, is_active) values
(
  '11111111-0000-0000-0000-000000000005',
  'tech',
  'SQL & Database Design',
  'Test your SQL knowledge: queries, joins, indexes, normalisation, and query optimisation.',
  1800,
  100,
  true
);

insert into questions (challenge_id, type, prompt, options, correct_answer, weight, order_index) values
(
  '11111111-0000-0000-0000-000000000005',
  'multiple_choice',
  'Which JOIN type returns all rows from the left table even if there is no match in the right table?',
  '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"RIGHT JOIN"},{"id":"c","text":"LEFT JOIN"},{"id":"d","text":"CROSS JOIN"}]',
  'c',
  1.0,
  1
),
(
  '11111111-0000-0000-0000-000000000005',
  'multiple_choice',
  'What does database normalisation primarily aim to reduce?',
  '[{"id":"a","text":"Query execution time"},{"id":"b","text":"Data redundancy and update anomalies"},{"id":"c","text":"The number of tables"},{"id":"d","text":"Index size"}]',
  'b',
  1.5,
  2
),
(
  '11111111-0000-0000-0000-000000000005',
  'multiple_choice',
  'An index on a column speeds up SELECT queries. What is the trade-off?',
  '[{"id":"a","text":"Indexes slow down SELECT queries too"},{"id":"b","text":"Indexes increase storage and slow down INSERT/UPDATE/DELETE operations"},{"id":"c","text":"Indexes can only be applied to primary keys"},{"id":"d","text":"There is no trade-off"}]',
  'b',
  1.5,
  3
),
(
  '11111111-0000-0000-0000-000000000005',
  'multiple_choice',
  'What does a GROUP BY clause do in SQL?',
  '[{"id":"a","text":"Filters rows before aggregation"},{"id":"b","text":"Sorts the result set"},{"id":"c","text":"Aggregates rows with the same values in specified columns"},{"id":"d","text":"Joins two tables"}]',
  'c',
  1.0,
  4
),
(
  '11111111-0000-0000-0000-000000000005',
  'multiple_choice',
  'What is an ACID transaction property? What does "Isolation" mean?',
  '[{"id":"a","text":"Transactions are stored in separate databases"},{"id":"b","text":"Each transaction executes as if it is the only transaction — intermediate states are not visible to others"},{"id":"c","text":"Data is never lost after a commit"},{"id":"d","text":"Each transaction must complete fully or not at all"}]',
  'b',
  2.0,
  5
);
