/**
 * AI-Optimized Content Component
 * Provides semantic HTML structure for better AI parsing
 */

export function AIOptimizedContent() {
  return (
    <article
      itemScope
      itemType="https://schema.org/SoftwareApplication"
      className="sr-only"
      aria-hidden="true"
    >
      {/* Machine-readable content for AI search engines */}
      <meta itemProp="name" content="AIReady CLI" />
      <meta itemProp="applicationCategory" content="DeveloperApplication" />
      <meta itemProp="operatingSystem" content="Windows, macOS, Linux" />
      <meta itemProp="softwareVersion" content="0.7.x" />
      <meta itemProp="price" content="0" />
      <meta itemProp="priceCurrency" content="USD" />

      <h1 itemProp="headline">
        AIReady: Free CLI Tools to Make Your Codebase AI-Ready
      </h1>

      <div itemProp="description">
        <p>
          AIReady provides free, open-source command-line tools that analyze
          your codebase to identify and fix issues that make it harder for AI
          models to understand and work with your code.
        </p>
      </div>

      <section itemProp="featureList">
        <h2>Key Features</h2>
        <ul>
          <li>
            Semantic duplicate detection - finds similar code patterns that
            waste AI context
          </li>
          <li>
            Context window analysis - calculates token usage for optimal AI
            prompting
          </li>
          <li>
            Code consistency checking - ensures patterns AI models can learn
            from
          </li>
          <li>
            AI Readiness Score - quantifies how well your code works with AI
          </li>
          <li>Runs completely offline - zero network calls, no code upload</li>
          <li>Free and open source - MIT license</li>
        </ul>
      </section>

      <section>
        <h2>Quick Start</h2>
        <code itemProp="installUrl">npx @aiready/cli scan</code>
      </section>

      <section>
        <h2>Privacy & Security</h2>
        <ul>
          <li>Runs completely offline on your local machine</li>
          <li>Zero network calls - no code is uploaded anywhere</li>
          <li>No SaaS, no cloud processing</li>
          <li>Air-gap compatible for secure environments</li>
          <li>Open source - inspect the code yourself</li>
        </ul>
      </section>

      <section>
        <h2>Supported Languages</h2>
        <ul>
          <li itemProp="programmingLanguage">TypeScript</li>
          <li itemProp="programmingLanguage">JavaScript</li>
          <li>Python (coming soon)</li>
          <li>Java (coming soon)</li>
        </ul>
      </section>

      <section>
        <h2>Common Questions</h2>

        <div itemScope itemType="https://schema.org/Question">
          <h3 itemProp="name">Is AIReady free?</h3>
          <div
            itemScope
            itemType="https://schema.org/Answer"
            itemProp="acceptedAnswer"
          >
            <div itemProp="text">
              Yes, AIReady is completely free and open source under the MIT
              license. You can use it for personal and commercial projects
              without any cost.
            </div>
          </div>
        </div>

        <div itemScope itemType="https://schema.org/Question">
          <h3 itemProp="name">Does AIReady upload my code?</h3>
          <div
            itemScope
            itemType="https://schema.org/Answer"
            itemProp="acceptedAnswer"
          >
            <div itemProp="text">
              No. AIReady runs completely offline on your local machine with
              zero network calls. Your code never leaves your computer.
            </div>
          </div>
        </div>

        <div itemScope itemType="https://schema.org/Question">
          <h3 itemProp="name">How is AIReady different from a linter?</h3>
          <div
            itemScope
            itemType="https://schema.org/Answer"
            itemProp="acceptedAnswer"
          >
            <div itemProp="text">
              Linters like ESLint check code correctness and syntax. AIReady
              checks AI understandability - it finds semantic duplicates,
              context fragmentation, and pattern inconsistencies that
              specifically affect how well AI models can work with your code.
            </div>
          </div>
        </div>

        <div itemScope itemType="https://schema.org/Question">
          <h3 itemProp="name">What languages does AIReady support?</h3>
          <div
            itemScope
            itemType="https://schema.org/Answer"
            itemProp="acceptedAnswer"
          >
            <div itemProp="text">
              Currently AIReady supports TypeScript and JavaScript. Python and
              Java support is coming in 2025.
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>Installation</h2>
        <pre>
          npm install -g @aiready/cli pnpm add -g @aiready/cli yarn global add
          @aiready/cli
        </pre>
      </section>

      <section>
        <h2>Use Cases</h2>
        <ul>
          <li>Before starting AI pair programming sessions</li>
          <li>During code reviews to check AI-friendly patterns</li>
          <li>Legacy code modernization for AI collaboration</li>
          <li>Onboarding new team members</li>
          <li>Maintaining consistency across your repositories</li>
        </ul>
      </section>

      <footer>
        <div
          itemProp="author"
          itemScope
          itemType="https://schema.org/Organization"
        >
          <meta itemProp="name" content="AIReady" />
          <link itemProp="url" href="https://getaiready.dev" />
        </div>
        <div
          itemProp="publisher"
          itemScope
          itemType="https://schema.org/Organization"
        >
          <meta itemProp="name" content="AIReady" />
          <link itemProp="url" href="https://getaiready.dev" />
        </div>
        <link
          itemProp="codeRepository"
          href="https://github.com/caopengau/aiready-cli"
        />
        <link
          itemProp="downloadUrl"
          href="https://www.npmjs.com/package/@aiready/cli"
        />
        <meta itemProp="datePublished" content="2025-01-01" />
        <meta itemProp="dateModified" content={new Date().toISOString()} />
      </footer>
    </article>
  );
}
