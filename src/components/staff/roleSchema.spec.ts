import { roleSchema } from '@/components/staff/roleSchema';

describe('roleSchema', () => {
  it('trims the name and accepts an empty description', () => {
    const result = roleSchema.safeParse({ name: '  Packer  ', description: '' });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Packer');
  });

  it('asks for a name', () => {
    const result = roleSchema.safeParse({ name: '   ', description: '' });
    expect(result.error?.issues[0].message).toBe('Enter a role name.');
  });

  it('limits the name to 60 characters', () => {
    expect(roleSchema.safeParse({ name: 'a'.repeat(60), description: '' }).success).toBe(true);
    const result = roleSchema.safeParse({ name: 'a'.repeat(61), description: '' });
    expect(result.error?.issues[0].message).toBe('Keep the name to 60 characters.');
  });

  it('limits the description to 255 characters', () => {
    expect(roleSchema.safeParse({ name: 'Packer', description: 'a'.repeat(256) }).success).toBe(
      false,
    );
  });
});
