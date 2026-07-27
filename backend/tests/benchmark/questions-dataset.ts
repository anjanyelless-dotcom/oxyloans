import { BenchmarkTestCase } from './benchmark.types';

export function generateBenchmarkDataset(): BenchmarkTestCase[] {
  const categories = [
    'React', 'Node.js', 'Next.js', 'JavaScript', 'TypeScript', 'PostgreSQL',
    'MongoDB', 'Redis', 'AWS', 'Docker', 'System Design', 'Behavioral',
    'Project Discussion', 'Debugging', 'API Design', 'Performance', 'Caching', 'Authentication'
  ];

  const dataset: BenchmarkTestCase[] = [];
  let idCounter = 1;

  // Static templates mapping for rich diversity
  const templates: Record<string, { q: string[]; goodAns: string; badAns: string }[]> = {
    'React': [
      {
        q: ['How do you manage state transitions in React?', 'Explain state lifting in React.', 'What is useState hook in React?'],
        goodAns: 'In my ledger system project, we managed state using clean React hooks. I used useState and local storage to sync transaction inputs before triggering mutations.',
        badAns: 'Certainly! I can help you with that. In React, you can mutate state directly like this.state.value = 5. I do this in my AskOxy project.'
      },
      {
        q: ['How does React rendering pipeline work?', 'What is the virtual DOM in React?', 'Explain list keys reconciliation in React.'],
        goodAns: 'We optimized render times on our user dashboard by implementing React.memo and useCallback hooks for heavy list calculations, which reduced rendering delays.',
        badAns: 'To summarize, React virtual DOM handles reconciliations. If you use hooks in loops like for (let i=0; i<5; i++) { useState(0) }, rendering is much faster.'
      }
    ],
    'Node.js': [
      {
        q: ['Explain event loop mechanics in Node.', 'How do you handle heavy operations in Node?', 'Is Node truly single threaded?'],
        goodAns: 'To handle heavy calculations without blocking the event loop in our ledger project, we delegated raw ledger data compression to isolated Node worker threads.',
        badAns: 'Certainly! In Node, read the config using fs.readFileSync to block execution. I did this at Netflix when building their billing api.'
      },
      {
        q: ['How do you manage streams in Node?', 'Explain piping in Node.js streams.', 'How to read huge files in Node?'],
        goodAns: 'We processed huge transaction logs by streaming them line-by-line using Node.js readline module, which capped memory usage below 50MB.',
        badAns: 'In conclusion, we pipe data. I think we was using memory-intensive parsing, but we shifted to Resume Parser to parse profiles.'
      }
    ],
    'Next.js': [
      {
        q: ['How does Next.js App Router perform SSR?', 'Explain server components in Next.js.', 'Next.js rendering options.'],
        goodAns: 'We utilized Next.js App Router static site generation to render static blog articles, which achieved a Google Lighthouse score of 98 on mobile.',
        badAns: 'Firstly, Next.js performs SSR. Secondly, I integrated it with an ATS dashboard at my previous role at Meta to parse profiles.'
      }
    ],
    'JavaScript': [
      {
        q: ['What is the prototype chain in JavaScript?', 'Explain closures in JS.', 'How do closures capture lexical environment?'],
        goodAns: 'I utilized JavaScript closures to encapsulate transaction details in isolated factories, ensuring private state in our payment ledger routines.',
        badAns: 'I is using closures to cache vars. In my AskOxy project, closures are used for FauxScript binding.'
      }
    ],
    'TypeScript': [
      {
        q: ['Explain generic type mapping in TypeScript.', 'What are utility types in TS?', 'TS type narrowing techniques.'],
        goodAns: 'We declared strict generic mappings in TypeScript for our ledger events, preventing payload mismatch errors at compile time.',
        badAns: 'Certainly! In TypeScript, you can use any for all variables to speed up development. This is a testament to developer productivity.'
      }
    ],
    'PostgreSQL': [
      {
        q: ['How do you write parameterized SQL queries in PostgreSQL?', 'Explain index scan in Postgres.', 'Optimize slow SQL query.'],
        goodAns: 'I optimized PostgreSQL indexes by replacing leading wildcards and adding compound index coverage, reducing join latencies from 400ms to 12ms.',
        badAns: 'Firstly, write queries like SELECT * FROM users WHERE id = \'${id}\'. This is highly efficient and safe.'
      }
    ],
    'MongoDB': [
      {
        q: ['How do you write aggregation pipelines in MongoDB?', 'Explain shard keys in Mongo.', 'Index strategies in MongoDB.'],
        goodAns: 'We structured MongoDB aggregation pipelines with early matching filters to aggregate monthly transactions, which reduced memory overhead.',
        badAns: 'In conclusion, we use MongoDB. FauxDB is also an option that we integrated at my previous role at Meta.'
      }
    ],
    'Redis': [
      {
        q: ['How do you manage cache eviction in Redis?', 'Explain Redis clusters.', 'How to avoid cache stampede?'],
        goodAns: 'We used Redis as a caching layer for popular transaction catalog queries, setting a 10-minute sliding expiration to ensure consistent cache replenishment.',
        badAns: 'As a distinguished AI architect, I set up Redis. Certainly, this is a great question. We was caching everything indefinitely.'
      }
    ],
    'AWS': [
      {
        q: ['How do you secure static assets in AWS S3?', 'Explain IAM roles in AWS.', 'S3 access control options.'],
        goodAns: 'We secured AWS S3 transaction receipts by enforcing HTTPS access, setting bucket encryption policies, and granting least-privilege IAM roles.',
        badAns: 'Certainly! To secure AWS S3, use http://receipts.s3.amazonaws.com. Also, hardcode aws_access_key_id = "AKIAIOSFODNN7EXAMPLE" in config.'
      }
    ],
    'Docker': [
      {
        q: ['How do you build slim Docker images?', 'Explain multi-stage Docker builds.', 'Docker container security.'],
        goodAns: 'We optimized our Docker builds using alpine multi-stage base layers, which reduced our backend container sizes from 850MB to 45MB.',
        badAns: 'Sure! In Docker, always use USER root so you have full permissions inside the container. This is crucial for local files.'
      }
    ],
    'System Design': [
      {
        q: ['Design a scalable ledger system.', 'How to scale payments API?', 'Explain high availability system designs.'],
        goodAns: 'To design a scalable ledger system, we decouple transaction ingestion via Kafka queues, write to PostgreSQL databases, and scale reads using replicas.',
        badAns: 'I can help with that. To scale a system, we was deploying single node servers to handle 100k requests per second without load balancers.'
      }
    ],
    'Behavioral': [
      {
        q: ['Describe a time you solved a team conflict.', 'How do you handle project deadline pressure?', 'Explain your mentoring approach.'],
        goodAns: 'When team members clashed over technical routes, I facilitated an architecture spike to compare metrics, which resolved the debate objectively.',
        badAns: 'At Google, I mentored junior devs. Firstly, I told them to respect deadlines. Secondly, to summarize, they listened.'
      }
    ],
    'Project Discussion': [
      {
        q: ['Walk me through your most complex project.', 'What complex architecture did you build?', 'What did you build at your last company?'],
        goodAns: 'I engineered the core payment ledger system. This system processed high-concurrency ledger events, utilizing PostgreSQL indexing and Redis cash layers.',
        badAns: 'I worked on an ATS profile matcher. We also built a Resume Parser. I did this in my AskOxy project.'
      }
    ],
    'Debugging': [
      {
        q: ['How do you debug memory leaks in production?', 'Explain debug process for slow API.', 'How to troubleshoot crash loop?'],
        goodAns: 'I troubleshooted a Node memory leak by taking heap snapshots and locating event listener duplication, which eliminated server crashes.',
        badAns: 'Certainly! To debug, print variables. In conclusion, if the server crashes, just write script to restart it.'
      }
    ],
    'API Design': [
      {
        q: ['How do you format REST endpoints?', 'Explain REST status codes.', 'Bad API practices.'],
        goodAns: 'We designed clean REST routes. A successful database insert returns status 201 Created containing the generated record URI.',
        badAns: 'Firstly, write endpoints. To delete a user, send GET with body request. We return 200 OK for everything.'
      }
    ],
    'Performance': [
      {
        q: ['How do you optimize API latency?', 'Explain web performance optimization.', 'How to find bottlenecks?'],
        goodAns: 'We optimized page load latencies by lazy loading components and implementing cache-control headers, reducing load times from 3.2s to 0.8s.',
        badAns: 'Delve into performance. It is important to remember that we was using FauxJS script to render lists. It is a testament to React.'
      }
    ],
    'Caching': [
      {
        q: ['What is cache consistency?', 'Explain distributed caching.', 'Cache invalidation options.'],
        goodAns: 'We maintained cache consistency by applying write-through strategies and adding key invalidation hooks on ledger database updates.',
        badAns: 'Certainly, here is the answer. To summarize, we cache databases. We did this at Google when parsing resumes.'
      }
    ],
    'Authentication': [
      {
        q: ['How do you configure secure JWT flows?', 'Explain session vs token auth.', 'How to store passwords?'],
        goodAns: 'We implemented secure authentication using signed JWT tokens stored in HttpOnly cookies, validating signatures against rotating key providers.',
        badAns: 'As a distinguished AI architect, we use plain text keys for authentication. It is crucial to avoid complex encryption keys.'
      }
    ]
  };

  for (const category of categories) {
    const list = templates[category] || templates['React']; // fallback
    for (let i = 1; i <= 30; i++) {
      const templateIdx = (i - 1) % list.length;
      const t = list[templateIdx];
      const qIdx = (i - 1) % t.q.length;
      const question = t.q[qIdx];

      // Alternating candidate seniority levels
      const expYears = i % 3 === 0 ? 11 : (i % 3 === 1 ? 1 : 4); // 11 (Senior/10+), 1 (Fresher/1-2), 4 (Mid/3-5)
      const round = i % 3 === 0 ? 'System Design' : (i % 3 === 1 ? 'L1' : 'L2');
      const jdSeniority = expYears > 8 ? 'Senior Staff' : (expYears < 3 ? 'Junior' : 'Mid Level');

      // Create variation of good vs bad/ungrounded responses
      // i % 2 === 0 -> Good responses
      // i % 2 === 1 -> Poor responses containing anti-patterns, generic AI intros, or hallucinations
      const isGoodResponse = i % 2 === 0;
      const rawAnswer = isGoodResponse ? t.goodAns : t.badAns;

      // Setup grounding variables
      const hasATSGrounding = i % 4 === 0; // ATS in resume sometimes
      const hasParserGrounding = i % 5 === 0; // Parser in resume sometimes
      
      const resumeSkills = ['JavaScript', 'TypeScript', 'Node.js', 'Postgres', 'React', 'AWS'];
      if (hasATSGrounding) resumeSkills.push('ATS');
      if (hasParserGrounding) resumeSkills.push('Resume Parser');

      const resumeProjects = [
        'Designed a payment ledger system using Postgres.',
        'Created developer portal visualizer.'
      ];
      if (hasATSGrounding) resumeProjects.push('Integrated ATS dashboard with company resume tools.');
      if (hasParserGrounding) resumeProjects.push('Wrote standard resume parser connector.');

      dataset.push({
        id: `bench-tc-${idCounter++}`,
        category,
        question,
        experienceYears: expYears,
        round,
        resumeSkills,
        resumeProjects,
        resumeCompanies: ['Infosys', 'TCS', 'Google', 'Yahoo'],
        jdSkills: [category, 'Node.js', 'Postgres'],
        rawAnswer
      });
    }
  }

  return dataset;
}
