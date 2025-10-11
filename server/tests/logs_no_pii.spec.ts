// Test: logs do not contain PII (email, tokens)
import { redactPII } from '../src/middleware/logger';

describe('Logs No PII', () => {
  it('redactPII masks email addresses', () => {
    const input = { email: 'user@example.com', name: 'John' };
    const output = redactPII(input);
    expect(output.email).toMatch(/^u\*\*\*@example\.com$/);
    expect(output.name).toBe('John');
  });

  it('redactPII masks tokens', () => {
    const input = { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' };
    const output = redactPII(input);
    expect(output.token).toBe('***');
  });

  it('redactPII handles nested objects', () => {
    const input = { user: { email: 'test@test.com', password: 'secret' }, token: 'abc123def456ghi789jkl' };
    const output = redactPII(input);
    expect(output.user.email).toMatch(/^t\*\*\*@test\.com$/);
    expect(output.token).toBe('***');
  });

  it('no raw email in logs regex check', () => {
    const logOutput = JSON.stringify(redactPII({ email: 'admin@pluqla.com', password: 'pass123' }));
    expect(logOutput).not.toMatch(/admin@pluqla\.com/);
    expect(logOutput).toMatch(/a\*\*\*@pluqla\.com/);
  });
});
