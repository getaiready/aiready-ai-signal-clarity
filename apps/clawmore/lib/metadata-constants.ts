export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ClawMore',
  url: 'https://clawmore.ai',
  logo: 'https://clawmore.ai/logo.png',
  description:
    "Simple one-click OpenClaw deployment. The world's first autonomous agentic swarm for serverless AWS.",
  sameAs: ['https://github.com/serverlessclaw/serverlessclaw'],
};

export const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ClawMore',
  url: 'https://clawmore.ai',
  description:
    'Simple one-click OpenClaw deployment for serverless agentic swarm AI orchestration.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://clawmore.ai/blog?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export const SOFTWARE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ClawMore',
  description:
    'ClawMore: The first autonomous platform for Multi-Human Multi-Agent Collaboration on serverless AWS. Orchestrate autonomous agentic swarms with human-in-the-loop workflows.',
  applicationCategory: 'DevOpsApplication',
  operatingSystem: 'AWS',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Perpetual Evolution',
  },
};

export const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is ClawMore?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ClawMore is an autonomous platform that manages your AWS infrastructure and automatically improves your codebase. It monitors your system, detects issues, and applies fixes — so you can focus on building features.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the auto-fix system work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ClawMore runs a continuous loop: it scans your logs and performance data, identifies areas for improvement, generates a code fix using AI, and commits it to your repository. You review and approve every change.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is it safe to connect my AWS account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. ClawMore runs in your own AWS account (BYOC), not ours. It uses strict permission boundaries that prevent it from accessing data outside your infrastructure. You maintain full control.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does the $29/month Solo plan include?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Solo plan includes managed infrastructure, a web dashboard, unlimited repositories, priority support, and $10/month in AI credits for code fixes. You can cancel anytime.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use it for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. OpenClaw is open-source. You can self-host the entire stack for free. Our managed plans (Solo, Team, Enterprise) provide a hosted dashboard, maintenance, and AI credits.',
      },
    },
  ],
};

export const FAQ_ITEMS = [
  {
    question: 'What is ClawMore?',
    answer:
      'ClawMore is an AI-powered platform that automatically monitors, optimizes, and fixes your AWS infrastructure. It saves you time by handling routine maintenance and improvements so you can focus on building your product.',
  },
  {
    question: 'How does the auto-fix system work?',
    answer:
      'ClawMore continuously scans your infrastructure and code for issues. When it finds something that can be improved, it generates a fix using AI and creates a pull request for your review. You maintain full control - nothing is changed without your approval.',
  },
  {
    question: 'Is it safe to connect my AWS account?',
    answer:
      'Absolutely. ClawMore uses read-only permissions by default and follows the principle of least privilege. Your code and data stay in your AWS account. We never access your sensitive information, and you can revoke access at any time.',
  },
  {
    question: 'What does the $29/month Solo plan include?',
    answer:
      "The Solo plan includes unlimited repositories and scans, $10/month in AI credits for auto-fixes, priority support, and advanced monitoring. It's perfect for individual developers who want to automate their infrastructure management.",
  },
  {
    question: 'Can I use it for free?',
    answer:
      'Yes! OpenClaw is open-source. You can self-host the stack yourself for free. We offer managed plans starting at $29/month if you want us to handle the infrastructure, updates, and provide a web-based management console.',
  },
  {
    question: "What happens if I'm not satisfied?",
    answer:
      "We offer a 30-day money-back guarantee. If you're not completely satisfied with ClawMore within the first 30 days, we'll refund your payment in full - no questions asked.",
  },
];
