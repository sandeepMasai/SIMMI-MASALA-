import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { UserModel } from '../modules/users/user.model.js';
import { hashPassword } from '../modules/auth/password.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

async function seedAdmin() {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    throw new Error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in environment before seeding admin');
  }

  await connectDatabase();
  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);
  const existing = await UserModel.findOne({ email }).select('+passwordHash');

  if (existing) {
    existing.role = 'super_admin';
    existing.passwordHash = passwordHash;
    existing.accountStatus = 'active';
    if (!existing.emailVerifiedAt) existing.emailVerifiedAt = new Date();
    if (env.SUPER_ADMIN_NAME) existing.name = env.SUPER_ADMIN_NAME;
    await existing.save();
    logger.info({ email }, 'Super admin updated (role, password, status)');
  } else {
    await UserModel.create({
      name: env.SUPER_ADMIN_NAME,
      email,
      passwordHash,
      role: 'super_admin',
      emailVerifiedAt: new Date(),
      accountStatus: 'active',
    });
    logger.info({ email }, 'Super admin created');
  }
  await disconnectDatabase();
}

seedAdmin().catch(async (err) => {
  logger.error({ err }, 'seed:admin failed');
  await disconnectDatabase();
  process.exit(1);
});
