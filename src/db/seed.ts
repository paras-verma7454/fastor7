import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db, closeDb } from './client.js';
import { employees, enquiries } from './schema.js';

const DEMO_PASSWORD = 'Password123';

const demoEmployees = [
  { name: 'Paras Verma', email: 'paras@fastor7.com' },
  { name: 'Ananya Rao', email: 'ananya@fastor7.com' },
];

const demoEnquiries = [
  {
    name: 'Riya Sharma',
    email: 'riya.sharma@example.com',
    phone: '+91 98765 43210',
    courseInterest: 'Full Stack Web Development',
    message: 'Looking to switch careers. Available on weekends.',
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '+91 91234 56780',
    courseInterest: 'Data Science & AI',
    message: 'Completed a Python course, want to go deeper.',
  },
  {
    name: 'Neha Kapoor',
    email: 'neha.kapoor@example.com',
    phone: null,
    courseInterest: 'UI/UX Design',
    message: null,
  },
  {
    name: 'Vikram Singh',
    email: 'vikram.singh@example.com',
    phone: '+91 90000 11122',
    courseInterest: 'Cloud Computing',
    message: 'Employer is sponsoring the certification.',
  },
  {
    name: 'Sara Khan',
    email: 'sara.khan@example.com',
    phone: '+91 99887 76655',
    courseInterest: 'Full Stack Web Development',
    message: null,
  },
  {
    name: 'Dev Patel',
    email: 'dev.patel@example.com',
    phone: null,
    courseInterest: 'Data Science & AI',
    message: 'Asked about EMI options.',
  },
];

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);

  await db
    .insert(employees)
    .values(
      demoEmployees.map((employee) => ({
        name: employee.name,
        email: employee.email,
        passwordHash,
      })),
    )
    .onConflictDoNothing({ target: employees.email });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries);

  if ((count ?? 0) > 0) {
    console.log(`[seed] ${count} enquiries already present, leaving them alone`);
  } else {
    await db.insert(enquiries).values(
      demoEnquiries.map((enquiry) => ({ ...enquiry, source: 'web_form' })),
    );
    console.log(`[seed] inserted ${demoEnquiries.length} unclaimed enquiries`);
  }

  console.log(
    `[seed] demo accounts (password: ${DEMO_PASSWORD}): ${demoEmployees
      .map((employee) => employee.email)
      .join(', ')}`,
  );
}

seed()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
