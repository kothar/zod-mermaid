import { globalRegistry, z } from 'zod';
import { idRef } from '../id-ref';

describe('idRef', () => {
  it('should create a string field referencing another entity by ID', () => {
    const CustomerSchema = z.object({ id: z.string() }).describe('Customer');
    const refField = idRef(CustomerSchema);
    expect(refField.safeParse('abc').success).toBe(true);

    const meta = globalRegistry.get(refField);
    expect(meta?.['targetEntityName']).toBe('Customer');
  });

  it('should throw if the id field does not exist', () => {
    const NoIdSchema = z.object({ name: z.string() });
    expect(() => idRef(NoIdSchema)).toThrow("ID field 'id' not found in schema");
  });

  it('should use a custom id field name if provided', () => {
    const CustomSchema = z.object({ uuid: z.string() }).describe('Custom');
    const refField = idRef(CustomSchema, 'uuid');
    expect(refField.safeParse('abc').success).toBe(true);

    const meta = globalRegistry.get(refField);
    expect(meta?.['targetEntityName']).toBe('Custom');
  });

  it('should use a custom entity name if provided', () => {
    const CustomerSchema = z.object({ id: z.string() });
    const refField = idRef(CustomerSchema, 'id', 'MyCustomer');
    const meta = globalRegistry.get(refField);
    expect(meta?.['targetEntityName']).toBe('MyCustomer');
  });
});