import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { employees, type Employee } from '../../db/schema.js';
import { AppError } from '../../utils/errors.js';
import { signAccessToken } from '../../utils/jwt.js';
import { findPgError } from '../../utils/pg.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export type PublicEmployee = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type AuthResult = { employee: PublicEmployee; token: string };

const DUMMY_PASSWORD = '__timing_equalizer__';
let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(DUMMY_PASSWORD, env.BCRYPT_ROUNDS);
  return dummyHash;
}

function toPublic(employee: Employee): PublicEmployee {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    createdAt: employee.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return findPgError(error)?.code === '23505';
}

export async function registerEmployee(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  try {
    const [employee] = await db
      .insert(employees)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning();

    if (!employee) {
      throw new Error('Insert returned no row');
    }

    return {
      employee: toPublic(employee),
      token: signAccessToken({ sub: employee.id, email: employee.email }),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw AppError.conflict(
        'EMAIL_TAKEN',
        'An account with this email already exists',
      );
    }
    throw error;
  }
}

export async function loginEmployee(input: LoginInput): Promise<AuthResult> {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, input.email))
    .limit(1);

  if (!employee) {
    // Compare against a throwaway hash so an unknown email costs the same
    // time as a wrong password and cannot be detected by timing.
    await bcrypt.compare(input.password, await getDummyHash());
    throw AppError.unauthorized(
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
  }

  const valid = await bcrypt.compare(input.password, employee.passwordHash);
  if (!valid) {
    throw AppError.unauthorized(
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
  }

  return {
    employee: toPublic(employee),
    token: signAccessToken({ sub: employee.id, email: employee.email }),
  };
}

export async function getProfile(employeeId: string): Promise<PublicEmployee> {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    throw AppError.unauthorized('TOKEN_INVALID', 'Account no longer exists');
  }

  return toPublic(employee);
}
