import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncOrchestrator } from './sync-orchestrator';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('Success'),
}));

describe('SyncOrchestrator', () => {
  let orchestrator: SyncOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SyncOrchestrator('sync-rules.json');
  });

  it('should generate correct git subtree pull command for Hub to Spoke sync', async () => {
    const options = {
      workingDir: '/tmp/test-spoke',
      hubUrl: 'https://github.com/serverlessclaw/serverlessclaw',
      hubBranch: 'main',
      spokeBranch: 'main',
      prefix: 'core-blueprint',
    };

    await orchestrator.syncHubToSpoke(options);

    // Verify commands executed
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('git remote add hub-origin'),
      expect.anything()
    );

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('git fetch hub-origin main'),
      expect.anything()
    );

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(
        'git subtree pull --prefix=core-blueprint hub-origin main --squash'
      ),
      expect.anything()
    );
  });

  it('should generate correct git subtree push command for Spoke to Hub contribution', async () => {
    const options = {
      workingDir: '/tmp/test-spoke',
      hubUrl: 'https://github.com/serverlessclaw/serverlessclaw',
      hubBranch: 'main',
      spokeBranch: 'main',
      prefix: 'core-blueprint',
    };

    await orchestrator.pushSpokeToHub(options);

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(
        'git subtree push --prefix=core-blueprint hub-origin main'
      ),
      expect.anything()
    );
  });
});
