/**
 * Database Seed Script
 * Populates database with mock data for testing and development
 */

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Mock data - User Roles and Teams
const mockUsers = [
  {
    username: 'ali.ahmad',
    email: 'ali.ahmad@company.com',
    password: 'DemoPassword123!',
    firstName: 'Ali',
    lastName: 'Ahmad',
    role: 'admin',
  },
  {
    username: 'hina.tariq',
    email: 'hina.tariq@company.com',
    password: 'DemoPassword123!',
    firstName: 'Hina',
    lastName: 'Tariq',
    role: 'staff',
    teamName: 'Team Alpha',
  },
  {
    username: 'omar.farooq',
    email: 'omar.farooq@company.com',
    password: 'DemoPassword123!',
    firstName: 'Omar',
    lastName: 'Farooq',
    role: 'staff',
    teamName: 'Team Alpha',
  },
  {
    username: 'bilal.aslam',
    email: 'bilal.aslam@company.com',
    password: 'DemoPassword123!',
    firstName: 'Bilal',
    lastName: 'Aslam',
    role: 'checking',
  },
  {
    username: 'sara.khan',
    email: 'sara.khan@company.com',
    password: 'DemoPassword123!',
    firstName: 'Sara',
    lastName: 'Khan',
    role: 'finance',
  },
  {
    username: 'usman.raza',
    email: 'usman.raza@company.com',
    password: 'DemoPassword123!',
    firstName: 'Usman',
    lastName: 'Raza',
    role: 'team-leader',
    teamName: 'Team Alpha',
  },
  {
    username: 'mahnoor.iqbal',
    email: 'mahnoor.iqbal@company.com',
    password: 'DemoPassword123!',
    firstName: 'Mahnoor',
    lastName: 'Iqbal',
    role: 'team-leader',
    teamName: 'Team Bravo',
  },
];

// Mock Bloggers
const mockBloggers = [
  {
    uid: 'TT10293847',
    username: '@ayesha.khan',
    name: 'Ayesha Khan',
    engagementScore: 8.5,
    followersCount: 180000,
    cooperationCount: 2,
    lastCooperation: '2026-06-22',
    blacklisted: false,
  },
  {
    uid: 'TT88213765',
    username: '@viral.vibes',
    name: 'Hamza Sheikh',
    engagementScore: 9.2,
    followersCount: 500000,
    cooperationCount: 0,
    lastCooperation: null,
    blacklisted: false,
  },
  {
    uid: 'TT55092314',
    username: '@zara.creative',
    name: 'Zara Malik',
    engagementScore: 7.1,
    followersCount: 120000,
    cooperationCount: 1,
    lastCooperation: '2025-11-10',
    blacklisted: true,
    blacklistReason: 'Plagiarism - Copied competitor content',
    blacklistDate: '2026-04-15',
  },
  {
    uid: 'TT67391852',
    username: '@sana.javed',
    name: 'Sana Javed',
    engagementScore: 8.8,
    followersCount: 250000,
    cooperationCount: 1,
    lastCooperation: '2026-05-15',
    blacklisted: false,
  },
  {
    uid: 'TT91827364',
    username: '@imran.sheikh',
    name: 'Imran Sheikh',
    engagementScore: 8.3,
    followersCount: 200000,
    cooperationCount: 0,
    lastCooperation: null,
    blacklisted: false,
  },
];

// Mock Applications
const mockApplications = [
  {
    id: 'REQ-1001',
    bloggerUid: 'TT10293847',
    staffName: 'Hina Tariq',
    campaignName: 'Q1 Brand Awareness',
    requestedBudget: 85000,
    approvedBudget: 85000,
    eligibilityStatus: 'waiting-period',
    checkingStatus: 'approved',
    financeStatus: 'approved',
    finalResult: 'approved',
    submittedAt: '2026-05-15',
  },
  {
    id: 'REQ-1002',
    bloggerUid: 'TT88213765',
    staffName: 'Omar Farooq',
    campaignName: 'Summer Campaign',
    requestedBudget: 95000,
    approvedBudget: 95000,
    eligibilityStatus: 'eligible',
    checkingStatus: 'approved',
    financeStatus: 'approved',
    finalResult: 'approved',
    submittedAt: '2026-05-20',
  },
  {
    id: 'REQ-1005',
    bloggerUid: 'TT10293847',
    staffName: 'Hina Tariq',
    campaignName: 'Product Launch',
    requestedBudget: 75000,
    approvedBudget: null,
    eligibilityStatus: 'waiting-period',
    checkingStatus: 'rejected',
    financeStatus: 'pending',
    finalResult: 'rejected',
    submittedAt: '2026-06-10',
  },
  {
    id: 'REQ-1008',
    bloggerUid: 'TT67391852',
    staffName: 'Omar Farooq',
    campaignName: 'Q2 Engagement',
    requestedBudget: 65000,
    approvedBudget: 65000,
    eligibilityStatus: 'waiting-period',
    checkingStatus: 'approved',
    financeStatus: 'approved',
    finalResult: 'approved',
    submittedAt: '2026-06-18',
  },
  {
    id: 'REQ-1012',
    bloggerUid: 'TT88213765',
    staffName: 'Hina Tariq',
    campaignName: 'Summer Product Launch 2026',
    requestedBudget: 75000,
    approvedBudget: 75000,
    eligibilityStatus: 'eligible',
    checkingStatus: 'approved',
    financeStatus: 'approved',
    finalResult: 'approved',
    submittedAt: '2026-06-30',
  },
];

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...\n');

    // 1. Create Teams
    console.log('📦 Creating teams...');
    const teamResult = await client.query(
      `INSERT INTO teams (name, monthly_budget) VALUES ($1, $2), ($3, $4), ($5, $6)
       RETURNING id, name`,
      ['Team Alpha', 500000, 'Team Bravo', 600000, 'Team Charlie', 450000]
    );
    const teams = {};
    teamResult.rows.forEach(t => { teams[t.name] = t.id; });
    console.log(`✓ Created ${teamResult.rows.length} teams\n`);

    // 2. Create Users
    console.log('👥 Creating users...');
    const userIds = {};
    for (const user of mockUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const teamId = user.teamName ? teams[user.teamName] : null;

      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role, team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username`,
        [user.username, user.email, passwordHash, user.firstName, user.lastName, user.role, teamId]
      );
      userIds[user.username] = result.rows[0].id;
    }
    console.log(`✓ Created ${mockUsers.length} users\n`);

    // Update team leaders
    await client.query(
      `UPDATE teams SET team_leader_id = $1 WHERE name = 'Team Alpha'`,
      [userIds['usman.raza']]
    );
    await client.query(
      `UPDATE teams SET team_leader_id = $1 WHERE name = 'Team Bravo'`,
      [userIds['mahnoor.iqbal']]
    );

    // 3. Create Bloggers
    console.log('📍 Creating blogger profiles...');
    for (const blogger of mockBloggers) {
      await client.query(
        `INSERT INTO bloggers (uid, username, name, engagement_score, followers_count,
         cooperation_count, last_cooperation, blacklisted, blacklist_reason, blacklist_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          blogger.uid,
          blogger.username,
          blogger.name,
          blogger.engagementScore,
          blogger.followersCount,
          blogger.cooperationCount,
          blogger.lastCooperation,
          blogger.blacklisted,
          blogger.blacklistReason || null,
          blogger.blacklistDate || null,
        ]
      );
    }
    console.log(`✓ Created ${mockBloggers.length} blogger profiles\n`);

    // 4. Create Applications
    console.log('📋 Creating applications...');
    for (const app of mockApplications) {
      const staffId = userIds[app.staffName.toLowerCase().replace(' ', '.')];
      const teamId = staffId ? teams['Team Alpha'] : null;

      await client.query(
        `INSERT INTO applications (id, blogger_uid, staff_id, staff_name, team_id, campaign_name,
         requested_budget, approved_budget, eligibility_status, checking_status, finance_status,
         final_result, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          app.id,
          app.bloggerUid,
          staffId,
          app.staffName,
          teamId,
          app.campaignName,
          app.requestedBudget,
          app.approvedBudget,
          app.eligibilityStatus,
          app.checkingStatus,
          app.financeStatus,
          app.finalResult,
          app.submittedAt,
        ]
      );
    }
    console.log(`✓ Created ${mockApplications.length} applications\n`);

    // 5. Create a sample booking
    console.log('🔒 Creating sample booking...');
    const hinaId = userIds['hina.tariq'];
    const bookingResult = await client.query(
      `INSERT INTO blogger_bookings (blogger_uid, booked_by_staff_id, booked_by_staff_name,
       application_id, booked_until, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        'TT88213765',
        hinaId,
        'Hina Tariq',
        'REQ-1012',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        'active',
      ]
    );
    console.log(`✓ Created booking: ${bookingResult.rows[0].id}\n`);

    // Update blogger with booking info
    await client.query(
      `UPDATE bloggers SET booked_status = 'booked', booked_by_staff_id = $1,
       booked_by_staff_name = 'Hina Tariq', booked_until = $2, booking_id = $3
       WHERE uid = 'TT88213765'`,
      [hinaId, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), bookingResult.rows[0].id]
    );

    console.log('✅ Database seeding completed successfully!\n');
    console.log('Demo Users Created:');
    console.log('├── Admin: ali.ahmad / DemoPassword123!');
    console.log('├── Staff: hina.tariq / DemoPassword123!');
    console.log('├── Staff: omar.farooq / DemoPassword123!');
    console.log('├── Checking: bilal.aslam / DemoPassword123!');
    console.log('├── Finance: sara.khan / DemoPassword123!');
    console.log('├── Team Leader: usman.raza / DemoPassword123!');
    console.log('└── Team Leader: mahnoor.iqbal / DemoPassword123!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seedDatabase();
