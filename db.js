const crypto = require('crypto');
const { Pool } = require('pg');

const memoryStore = {
  schools: [],
};

function normalizeSubdomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function formatSchool(row) {
  const school = {
    id: row.id,
    school_name: row.school_name,
    school_email: row.school_email,
    admin_name: row.admin_name,
    package_type: row.package_type,
    subdomain: row.subdomain,
    trial_ends_at: row.trial_ends_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  school.trial_active = new Date(row.trial_ends_at) > new Date();
  school.package_label = school.package_type === 'finance' ? 'Finance + Payments' : 'Report Card Generation';
  return school;
}

function createStore() {
  const connectionString = process.env.DATABASE_URL || process.env.COCKROACH_DATABASE_URL;

  if (!connectionString) {
    return {
      kind: 'memory',
      pool: null,
      async init() {
        return this;
      },
      async listSchools() {
        return memoryStore.schools.map(formatSchool);
      },
      async createSchool(input) {
        const newSchool = {
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          school_name: input.school_name,
          school_email: input.school_email,
          admin_name: input.admin_name,
          package_type: input.package_type,
          subdomain: input.subdomain,
          admin_password_hash: hashPassword(input.password),
          trial_ends_at: input.trial_ends_at,
          status: input.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        memoryStore.schools.push(newSchool);
        return formatSchool(newSchool);
      },
      async getSchoolBySubdomain(subdomain) {
        const school = memoryStore.schools.find((entry) => entry.subdomain === subdomain);
        return school ? formatSchool(school) : null;
      },
      async getSchoolByEmail(email) {
        const school = memoryStore.schools.find((entry) => entry.school_email === email);
        return school ? formatSchool(school) : null;
      },
      async validateCredentials(email, password) {
        const school = memoryStore.schools.find((entry) => entry.school_email === email);
        if (!school) {
          return null;
        }
        const isValid = school.admin_password_hash === hashPassword(password);
        return isValid ? formatSchool(school) : null;
      },
    };
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  return {
    kind: 'postgres',
    pool,
    async init() {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS schools (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_name STRING NOT NULL,
          school_email STRING NOT NULL UNIQUE,
          admin_name STRING NOT NULL,
          package_type STRING NOT NULL,
          subdomain STRING NOT NULL UNIQUE,
          admin_password_hash STRING NOT NULL,
          trial_ends_at TIMESTAMP NOT NULL,
          status STRING NOT NULL DEFAULT 'trial',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      return this;
    },
    async listSchools() {
      const result = await this.pool.query(
        'SELECT * FROM schools ORDER BY created_at DESC'
      );
      return result.rows.map(formatSchool);
    },
    async createSchool(input) {
      const result = await this.pool.query(
        `INSERT INTO schools (school_name, school_email, admin_name, package_type, subdomain, admin_password_hash, trial_ends_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          input.school_name,
          input.school_email,
          input.admin_name,
          input.package_type,
          input.subdomain,
          hashPassword(input.password),
          input.trial_ends_at,
          input.status,
        ]
      );
      return formatSchool(result.rows[0]);
    },
    async getSchoolBySubdomain(subdomain) {
      const result = await this.pool.query('SELECT * FROM schools WHERE subdomain = $1', [subdomain]);
      if (!result.rows[0]) {
        return null;
      }
      return formatSchool(result.rows[0]);
    },
    async getSchoolByEmail(email) {
      const result = await this.pool.query('SELECT * FROM schools WHERE school_email = $1', [email]);
      if (!result.rows[0]) {
        return null;
      }
      return formatSchool(result.rows[0]);
    },
    async validateCredentials(email, password) {
      const result = await this.pool.query('SELECT * FROM schools WHERE school_email = $1', [email]);
      if (!result.rows[0]) {
        return null;
      }
      const isValid = result.rows[0].admin_password_hash === hashPassword(password);
      return isValid ? formatSchool(result.rows[0]) : null;
    },
  };
}

module.exports = {
  createStore,
  normalizeSubdomain,
  hashPassword,
};
