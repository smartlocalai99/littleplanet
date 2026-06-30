const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text, params) {
  return pool.query(text, params);
}

const ACCOUNTS = [
  { username: "admin", password: "1234", role: "SUPER_ADMIN", email: process.env.ADMIN_EMAIL || null },
  { username: "accountant", password: "1234", role: "ACCOUNTANT", email: process.env.ACCOUNTANT_EMAIL || null },
];

async function upsertAccount({ username, password, role, email }) {
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await query(
    'SELECT id FROM public."Login_accounts" WHERE username = $1 LIMIT 1',
    [username]
  );

  if (existing.rows[0]) {
    await query(
      'UPDATE public."Login_accounts" SET password = $1, role = $2, email = COALESCE($3, email) WHERE id = $4',
      [hashedPassword, role, email, existing.rows[0].id]
    );
    console.log(`Updated account "${username}" (role=${role})`);
  } else {
    await query(
      'INSERT INTO public."Login_accounts" (username, password, role, email) VALUES ($1, $2, $3, $4)',
      [username, hashedPassword, role, email]
    );
    console.log(`Created account "${username}" (role=${role})`);
  }
}

async function main() {
  for (const account of ACCOUNTS) {
    await upsertAccount(account);
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {
    // ignore shutdown issues
  }
  process.exit(1);
});
